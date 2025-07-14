import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { SharedLink } from 'src/database';
import { AssetIdErrorReason, AssetIdsResponseDto } from 'src/dtos/asset-ids.response.dto';
import { mapAsset } from 'src/dtos/asset-response.dto';
import { AssetIdsDto } from 'src/dtos/asset.dto';
import { AuthDto } from 'src/dtos/auth.dto';
import {
  mapSharedLink,
  mapSharedLinkWithoutMetadata,
  SharedLinkCreateDto,
  SharedLinkEditDto,
  SharedLinkPasswordDto,
  SharedLinkResponseDto,
  SharedLinkSearchDto,
} from 'src/dtos/shared-link.dto';
import { AssetOrder, Permission, SharedLinkType } from 'src/enum';
import { BaseService } from 'src/services/base.service';
import { DynamicAlbumService } from 'src/services/dynamic-album.service';
import { getExternalDomain, OpenGraphTags } from 'src/utils/misc';

@Injectable()
export class SharedLinkService extends BaseService {
  constructor(
    private dynamicAlbumService: DynamicAlbumService,
    ...args: ConstructorParameters<typeof BaseService>
  ) {
    super(...args);
  }

  async getAll(auth: AuthDto, { albumId }: SharedLinkSearchDto): Promise<SharedLinkResponseDto[]> {
    const links = await this.sharedLinkRepository.getAll({ userId: auth.user.id, albumId });
    return links.map((link) => mapSharedLink(link));
  }

  async getMine(auth: AuthDto, dto: SharedLinkPasswordDto): Promise<SharedLinkResponseDto> {
    if (!auth.sharedLink) {
      throw new ForbiddenException();
    }

    const sharedLink = await this.findOrFail(auth.user.id, auth.sharedLink.id);
    const response = await this.mapToSharedLink(sharedLink, { withExif: sharedLink.showExif });
    if (sharedLink.password) {
      response.token = this.validateAndRefreshToken(sharedLink, dto);
    }

    return response;
  }

  async get(auth: AuthDto, id: string): Promise<SharedLinkResponseDto> {
    const sharedLink = await this.findOrFail(auth.user.id, id);
    return await this.mapToSharedLink(sharedLink, { withExif: true });
  }

  async create(auth: AuthDto, dto: SharedLinkCreateDto): Promise<SharedLinkResponseDto> {
    switch (dto.type) {
      case SharedLinkType.ALBUM: {
        if (!dto.albumId) {
          throw new BadRequestException('Invalid albumId');
        }
        await this.requireAccess({ auth, permission: Permission.ALBUM_SHARE, ids: [dto.albumId] });
        break;
      }

      case SharedLinkType.INDIVIDUAL: {
        if (!dto.assetIds || dto.assetIds.length === 0) {
          throw new BadRequestException('Invalid assetIds');
        }

        await this.requireAccess({ auth, permission: Permission.ASSET_SHARE, ids: dto.assetIds });

        break;
      }
    }

    const sharedLink = await this.sharedLinkRepository.create({
      key: this.cryptoRepository.randomBytes(50),
      userId: auth.user.id,
      type: dto.type,
      albumId: dto.albumId || null,
      assetIds: dto.assetIds,
      description: dto.description || null,
      password: dto.password,
      expiresAt: dto.expiresAt || null,
      allowUpload: dto.allowUpload ?? true,
      allowDownload: dto.showMetadata === false ? false : (dto.allowDownload ?? true),
      showExif: dto.showMetadata ?? true,
    });

    return await this.mapToSharedLink(sharedLink, { withExif: true });
  }

  async update(auth: AuthDto, id: string, dto: SharedLinkEditDto) {
    await this.findOrFail(auth.user.id, id);
    const sharedLink = await this.sharedLinkRepository.update({
      id,
      userId: auth.user.id,
      description: dto.description,
      password: dto.password,
      expiresAt: dto.changeExpiryTime && !dto.expiresAt ? null : dto.expiresAt,
      allowUpload: dto.allowUpload,
      allowDownload: dto.allowDownload,
      showExif: dto.showMetadata,
    });
    return await this.mapToSharedLink(sharedLink, { withExif: true });
  }

  async remove(auth: AuthDto, id: string): Promise<void> {
    const sharedLink = await this.findOrFail(auth.user.id, id);
    await this.sharedLinkRepository.remove(sharedLink.id);
  }

  // TODO: replace `userId` with permissions and access control checks
  private async findOrFail(userId: string, id: string) {
    // For shared links, we need to get the shared link by ID without user restriction
    // since the user accessing it might not be the owner
    const sharedLink = await this.sharedLinkRepository.getById(id);
    if (!sharedLink) {
      throw new BadRequestException('Shared link not found');
    }
    return sharedLink;
  }

  async addAssets(auth: AuthDto, id: string, dto: AssetIdsDto): Promise<AssetIdsResponseDto[]> {
    const sharedLink = await this.findOrFail(auth.user.id, id);

    if (sharedLink.type !== SharedLinkType.INDIVIDUAL) {
      throw new BadRequestException('Invalid shared link type');
    }

    const existingAssetIds = new Set(sharedLink.assets.map((asset: any) => asset.id));
    const notPresentAssetIds = dto.assetIds.filter((assetId) => !existingAssetIds.has(assetId));
    const allowedAssetIds = await this.checkAccess({
      auth,
      permission: Permission.ASSET_SHARE,
      ids: notPresentAssetIds,
    });

    const results: AssetIdsResponseDto[] = [];
    for (const assetId of dto.assetIds) {
      const hasAsset = existingAssetIds.has(assetId);
      if (hasAsset) {
        results.push({ assetId, success: false, error: AssetIdErrorReason.DUPLICATE });
        continue;
      }

      const hasAccess = allowedAssetIds.has(assetId);
      if (!hasAccess) {
        results.push({ assetId, success: false, error: AssetIdErrorReason.NO_PERMISSION });
        continue;
      }

      results.push({ assetId, success: true });
    }

    await this.sharedLinkRepository.update({
      ...sharedLink,
      assetIds: results.filter(({ success }) => success).map(({ assetId }) => assetId),
    });

    return results;
  }

  async removeAssets(auth: AuthDto, id: string, dto: AssetIdsDto): Promise<AssetIdsResponseDto[]> {
    const sharedLink = await this.findOrFail(auth.user.id, id);

    if (sharedLink.type !== SharedLinkType.INDIVIDUAL) {
      throw new BadRequestException('Invalid shared link type');
    }

    const results: AssetIdsResponseDto[] = [];
    for (const assetId of dto.assetIds) {
      const hasAsset = sharedLink.assets.find((asset: any) => asset.id === assetId);
      if (!hasAsset) {
        results.push({ assetId, success: false, error: AssetIdErrorReason.NOT_FOUND });
        continue;
      }

      results.push({ assetId, success: true });
      sharedLink.assets = sharedLink.assets.filter((asset: any) => asset.id !== assetId);
    }

    await this.sharedLinkRepository.update(sharedLink);

    return results;
  }

  async getMetadataTags(auth: AuthDto, defaultDomain?: string): Promise<null | OpenGraphTags> {
    if (!auth.sharedLink || auth.sharedLink.password) {
      return null;
    }

    const config = await this.getConfig({ withCache: true });
    const sharedLink = await this.findOrFail(auth.sharedLink.userId, auth.sharedLink.id);
    const assetId = sharedLink.album?.albumThumbnailAssetId || sharedLink.assets[0]?.id;
    const assetCount = sharedLink.assets.length > 0 ? sharedLink.assets.length : sharedLink.album?.assets?.length || 0;
    const imagePath = assetId
      ? `/api/assets/${assetId}/thumbnail?key=${sharedLink.key.toString('base64url')}`
      : '/feature-panel.png';

    return {
      title: sharedLink.album ? sharedLink.album.albumName : 'Public Share',
      description: sharedLink.description || `${assetCount} shared photos & videos`,
      imageUrl: new URL(imagePath, getExternalDomain(config.server, defaultDomain)).href,
    };
  }

  private async mapToSharedLink(sharedLink: SharedLink, { withExif }: { withExif: boolean }) {
    const baseResponse = withExif ? mapSharedLink(sharedLink) : mapSharedLinkWithoutMetadata(sharedLink);

    // Handle dynamic albums by fetching assets based on filters
    if (sharedLink.album?.dynamic && sharedLink.album?.filters) {
      try {
        const searchResult = await this.dynamicAlbumService.getAssetsForDynamicAlbum(
          sharedLink.album.filters,
          sharedLink.album.ownerId,
          {
            page: 1,
            size: 50000, // Large page size to get all matching assets
            order: sharedLink.album.order === 'asc' ? AssetOrder.ASC : AssetOrder.DESC,
          },
          {
            throwOnError: false, // Don't throw on shared link errors
            timeout: 15000, // 15 second timeout for shared links
          },
        );

        if (searchResult && searchResult.items) {
          // Update the response with the dynamic album assets
          baseResponse.assets = searchResult.items.map((asset: any) => mapAsset(asset, { stripMetadata: !withExif }));

          // Also update the album's asset count for metadata
          if (baseResponse.album) {
            baseResponse.album.assetCount = searchResult.items.length;
          }
        }
      } catch (error) {
        this.logger.error('Failed to fetch dynamic album assets for shared link', error);
        // If search fails, keep the original assets (empty for dynamic albums)
      }
    }

    return baseResponse;
  }

  private validateAndRefreshToken(sharedLink: SharedLink, dto: SharedLinkPasswordDto): string {
    const token = this.cryptoRepository.hashSha256(`${sharedLink.id}-${sharedLink.password}`);
    const sharedLinkTokens = dto.token?.split(',') || [];
    if (sharedLink.password !== dto.password && !sharedLinkTokens.includes(token)) {
      throw new UnauthorizedException('Invalid password');
    }

    if (!sharedLinkTokens.includes(token)) {
      sharedLinkTokens.push(token);
    }
    return sharedLinkTokens.join(',');
  }
}
