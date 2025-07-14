import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthDto } from 'src/dtos/auth.dto';
import { TimeBucketAssetDto, TimeBucketDto, TimeBucketsResponseDto } from 'src/dtos/time-bucket.dto';
import { AssetVisibility, Permission } from 'src/enum';
import { TimeBucketOptions } from 'src/repositories/asset.repository';
import { BaseService } from 'src/services/base.service';
import { requireElevatedPermission } from 'src/utils/access';
import { getMyPartnerIds } from 'src/utils/asset.util';
import { hexOrBufferToBase64 } from 'src/utils/bytes';

@Injectable()
export class TimelineService extends BaseService {
  async getTimeBuckets(auth: AuthDto, dto: TimeBucketDto): Promise<TimeBucketsResponseDto[]> {
    await this.timeBucketChecks(auth, dto);

    // Check if this is a dynamic album
    if (dto.albumId) {
      const album = await this.albumRepository.getById(dto.albumId, { withAssets: false });
      if (album?.dynamic && album.filters) {
        // For dynamic albums, get assets via search and then create buckets manually
        return this.getTimeBucketsForDynamicAlbum(auth, dto, album.filters);
      }
    }

    const timeBucketOptions = await this.buildTimeBucketOptions(auth, dto);
    return await this.assetRepository.getTimeBuckets(timeBucketOptions);
  }

  // pre-jsonified response
  async getTimeBucket(auth: AuthDto, dto: TimeBucketAssetDto): Promise<string> {
    await this.timeBucketChecks(auth, dto);

    // Check if this is a dynamic album
    if (dto.albumId) {
      const album = await this.albumRepository.getById(dto.albumId, { withAssets: false });
      if (album?.dynamic && album.filters) {
        // For dynamic albums, get assets via search and then filter by time bucket
        return this.getTimeBucketForDynamicAlbum(auth, dto, album.filters);
      }
    }

    const timeBucketOptions = await this.buildTimeBucketOptions(auth, { ...dto });

    // TODO: use id cursor for pagination
    const bucket = await this.assetRepository.getTimeBucket(dto.timeBucket, timeBucketOptions);
    return bucket.assets;
  }

  private async getTimeBucketsForDynamicAlbum(
    auth: AuthDto,
    dto: TimeBucketDto,
    filters: any,
  ): Promise<TimeBucketsResponseDto[]> {
    // Use the dynamic album repository to get assets
    const assets = await this.dynamicAlbumRepository.getAssetsForTimelineBuckets(filters, auth.user.id, dto.order);

    // Group assets by time bucket
    const buckets = new Map<string, number>();

    for (const asset of assets) {
      const assetDate = new Date(asset.fileCreatedAt || asset.localDateTime);
      // Create time bucket in YYYY-MM format
      const timeBucket = `${assetDate.getFullYear()}-${String(assetDate.getMonth() + 1).padStart(2, '0')}-01`;
      buckets.set(timeBucket, (buckets.get(timeBucket) || 0) + 1);
    }

    // Convert to response format and sort
    return Array.from(buckets.entries())
      .map(([timeBucket, count]) => ({ timeBucket, count }))
      .sort((a, b) => b.timeBucket.localeCompare(a.timeBucket)); // Newest first
  }

  private async getTimeBucketForDynamicAlbum(auth: AuthDto, dto: TimeBucketAssetDto, filters: any): Promise<string> {
    // Use the dynamic album repository to get assets for the specific time bucket
    const bucketAssets = await this.dynamicAlbumRepository.getAssetsForTimeBucket(
      filters,
      auth.user.id,
      dto.timeBucket,
      dto.order,
    );

    // Format the response to match AssetRepository.getTimeBucket structure
    // This needs to be in the same aggregated array format
    const aggregatedResponse = {
      id: bucketAssets.map((asset: any) => asset.id),
      ownerId: bucketAssets.map((asset: any) => asset.ownerId),
      visibility: bucketAssets.map((asset: any) => asset.visibility || 'TIMELINE'),
      isFavorite: bucketAssets.map((asset: any) => asset.isFavorite || false),
      isImage: bucketAssets.map((asset: any) => asset.type === 'IMAGE'),
      isTrashed: bucketAssets.map(() => false), // Dynamic album assets are never trashed
      thumbhash: bucketAssets.map((asset: any) => (asset.thumbhash ? hexOrBufferToBase64(asset.thumbhash) : null)),
      fileCreatedAt: bucketAssets.map((asset: any) => asset.fileCreatedAt || asset.localDateTime),
      localOffsetHours: bucketAssets.map((asset: any) => {
        // Calculate offset hours from fileCreatedAt and localDateTime if available
        if (asset.fileCreatedAt && asset.localDateTime) {
          const fileDate = new Date(asset.fileCreatedAt);
          const localDate = new Date(asset.localDateTime);
          return (localDate.getTime() - fileDate.getTime()) / (1000 * 60 * 60);
        }
        return 0; // Default offset
      }),
      duration: bucketAssets.map((asset: any) => asset.duration || null),
      city: bucketAssets.map((asset: any) => asset.exifInfo?.city || null),
      country: bucketAssets.map((asset: any) => asset.exifInfo?.country || null),
      projectionType: bucketAssets.map((asset: any) => asset.exifInfo?.projectionType || null),
      livePhotoVideoId: bucketAssets.map((asset: any) => asset.livePhotoVideoId || null),
      ratio: bucketAssets.map((asset: any) => {
        // Calculate aspect ratio from exif info if available
        if (asset.exifInfo?.exifImageWidth && asset.exifInfo?.exifImageHeight) {
          // Check for orientation that would swap dimensions
          const orientation = asset.exifInfo.orientation;
          const isRotated = ['5', '6', '7', '8', '-90', '90'].includes(String(orientation));

          const width = asset.exifInfo.exifImageWidth;
          const height = asset.exifInfo.exifImageHeight;

          if (width === 0 || height === 0) return 1;

          if (isRotated) {
            return Math.round((height / width) * 1000) / 1000;
          } else {
            return Math.round((width / height) * 1000) / 1000;
          }
        }
        return 1; // Default ratio
      }),
      status: bucketAssets.map((asset: any) => asset.status || 'AVAILABLE'),
      ...(dto.withStacked && {
        stack: bucketAssets.map((asset: any) => {
          if (asset.stackId && asset.stackCount) {
            return [asset.stackId, String(asset.stackCount)];
          }
          return null;
        }),
      }),
    };

    return JSON.stringify(aggregatedResponse);
  }

  private async buildTimeBucketOptions(auth: AuthDto, dto: TimeBucketDto): Promise<TimeBucketOptions> {
    const { userId, ...options } = dto;
    let userIds: string[] | undefined = undefined;

    if (userId) {
      userIds = [userId];
      if (dto.withPartners) {
        const partnerIds = await getMyPartnerIds({
          userId: auth.user.id,
          repository: this.partnerRepository,
          timelineEnabled: true,
        });
        userIds.push(...partnerIds);
      }
    }

    return { ...options, userIds };
  }

  private async timeBucketChecks(auth: AuthDto, dto: TimeBucketDto) {
    if (dto.visibility === AssetVisibility.LOCKED) {
      requireElevatedPermission(auth);
    }

    if (dto.albumId) {
      await this.requireAccess({ auth, permission: Permission.ALBUM_READ, ids: [dto.albumId] });
    } else {
      dto.userId = dto.userId || auth.user.id;
    }

    if (dto.userId) {
      await this.requireAccess({ auth, permission: Permission.TIMELINE_READ, ids: [dto.userId] });
      if (dto.visibility === AssetVisibility.ARCHIVE) {
        await this.requireAccess({ auth, permission: Permission.ARCHIVE_READ, ids: [dto.userId] });
      }
    }

    if (dto.tagId) {
      await this.requireAccess({ auth, permission: Permission.TAG_READ, ids: [dto.tagId] });
    }

    if (dto.withPartners) {
      const requestedArchived = dto.visibility === AssetVisibility.ARCHIVE || dto.visibility === undefined;
      const requestedFavorite = dto.isFavorite === true || dto.isFavorite === false;
      const requestedTrash = dto.isTrashed === true;

      if (requestedArchived || requestedFavorite || requestedTrash) {
        throw new BadRequestException(
          'withPartners is only supported for non-archived, non-trashed, non-favorited assets',
        );
      }
    }
  }
}
