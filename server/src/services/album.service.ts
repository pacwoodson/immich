import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AddUsersDto,
  AlbumInfoDto,
  AlbumResponseDto,
  AlbumsAddAssetsDto,
  AlbumsAddAssetsResponseDto,
  AlbumStatisticsResponseDto,
  CreateAlbumDto,
  GetAlbumsDto,
  mapAlbum,
  MapAlbumDto,
  mapAlbumWithAssets,
  mapAlbumWithoutAssets,
  UpdateAlbumDto,
  UpdateAlbumUserDto,
} from 'src/dtos/album.dto';
import { mapAsset } from 'src/dtos/asset-response.dto';
import { BulkIdErrorReason, BulkIdResponseDto, BulkIdsDto } from 'src/dtos/asset-ids.response.dto';
import { AuthDto } from 'src/dtos/auth.dto';
import { Permission } from 'src/enum';
import { AlbumAssetCount, AlbumInfoOptions } from 'src/repositories/album.repository';
import { BaseService } from 'src/services/base.service';
import {
  DynamicAlbumFilters,
  DynamicAlbumFilterValidationResult,
  sanitizeDynamicAlbumFilters,
  validateDynamicAlbumFilters,
} from 'src/types/dynamic-album.types';
import { addAssets, removeAssets } from 'src/utils/asset.util';
import { getPreferences } from 'src/utils/preferences';

@Injectable()
export class AlbumService extends BaseService {
  async getStatistics(auth: AuthDto): Promise<AlbumStatisticsResponseDto> {
    const [owned, shared, notShared] = await Promise.all([
      this.albumRepository.getOwned(auth.user.id),
      this.albumRepository.getShared(auth.user.id),
      this.albumRepository.getNotShared(auth.user.id),
    ]);

    return {
      owned: owned.length,
      shared: shared.length,
      notShared: notShared.length,
    };
  }

  async getAll({ user: { id: ownerId } }: AuthDto, { assetId, shared }: GetAlbumsDto): Promise<AlbumResponseDto[]> {
    await this.albumRepository.updateThumbnails();

    let albums: MapAlbumDto[];
    if (assetId) {
      albums = await this.albumRepository.getByAssetId(ownerId, assetId);
    } else if (shared === true) {
      albums = await this.albumRepository.getShared(ownerId);
    } else if (shared === false) {
      albums = await this.albumRepository.getNotShared(ownerId);
    } else {
      albums = await this.albumRepository.getOwned(ownerId);
    }

    // Separate regular and dynamic albums
    const regularAlbums = albums.filter((album) => !album.dynamic);
    const dynamicAlbums = albums.filter((album) => album.dynamic);

    // Get metadata for regular albums (existing logic)
    const regularAlbumIds = regularAlbums.map((a) => a.id);
    const results = regularAlbumIds.length > 0 ? await this.albumRepository.getMetadataForIds(regularAlbumIds) : [];
    const albumMetadata: Record<string, AlbumAssetCount> = {};
    for (const metadata of results) {
      albumMetadata[metadata.albumId] = metadata;
    }

    // Calculate metadata for dynamic albums
    for (const dynamicAlbum of dynamicAlbums) {
      if (dynamicAlbum.filters) {
        try {
          const metadata = await this.dynamicAlbumRepository.getMetadata(
            dynamicAlbum.filters as DynamicAlbumFilters,
            ownerId,
          );

          // Update thumbnail if needed
          if (!dynamicAlbum.albumThumbnailAssetId && metadata.assetCount > 0) {
            const thumbnailId = await this.dynamicAlbumRepository.getThumbnailAssetId(
              dynamicAlbum.filters as DynamicAlbumFilters,
              ownerId,
            );
            if (thumbnailId) {
              await this.albumRepository.update(dynamicAlbum.id, {
                id: dynamicAlbum.id,
                albumThumbnailAssetId: thumbnailId,
              });
              dynamicAlbum.albumThumbnailAssetId = thumbnailId;
            }
          }

          albumMetadata[dynamicAlbum.id] = {
            albumId: dynamicAlbum.id,
            assetCount: metadata.assetCount,
            startDate: metadata.startDate,
            endDate: metadata.endDate,
            lastModifiedAssetTimestamp: metadata.lastModifiedAssetTimestamp,
          };
        } catch (error) {
          this.logger.error(`Error getting metadata for dynamic album ${dynamicAlbum.id}: ${error}`);
          // Provide default metadata for failed album
          albumMetadata[dynamicAlbum.id] = {
            albumId: dynamicAlbum.id,
            assetCount: 0,
            startDate: null,
            endDate: null,
            lastModifiedAssetTimestamp: null,
          };
        }
      }
    }

    return albums.map((album) => ({
      ...mapAlbumWithoutAssets(album),
      sharedLinks: undefined,
      startDate: albumMetadata[album.id]?.startDate ?? undefined,
      endDate: albumMetadata[album.id]?.endDate ?? undefined,
      assetCount: albumMetadata[album.id]?.assetCount ?? 0,
      // lastModifiedAssetTimestamp is only used in mobile app, please remove if not need
      lastModifiedAssetTimestamp: albumMetadata[album.id]?.lastModifiedAssetTimestamp ?? undefined,
    }));
  }

  async get(auth: AuthDto, id: string, dto: AlbumInfoDto): Promise<AlbumResponseDto> {
    await this.requireAccess({ auth, permission: Permission.AlbumRead, ids: [id] });
    await this.albumRepository.updateThumbnails();
    const withAssets = dto.withoutAssets === undefined ? true : !dto.withoutAssets;
    const album = await this.findOrFail(id, { withAssets: false });

    const hasSharedUsers = album.albumUsers && album.albumUsers.length > 0;
    const hasSharedLink = album.sharedLinks && album.sharedLinks.length > 0;
    const isShared = hasSharedUsers || hasSharedLink;

    // Handle dynamic albums
    if (album.dynamic && album.filters) {
      try {
        // Fetch computed assets for dynamic album
        const searchResult = await this.dynamicAlbumRepository.getAssets(
          album.filters as DynamicAlbumFilters,
          auth.user.id,
          { size: 50000, order: album.order },
        );

        const assets = searchResult.items || [];

        // Update thumbnail if needed
        if (!album.albumThumbnailAssetId && assets.length > 0) {
          const thumbnailId = assets[0].id;
          await this.albumRepository.update(album.id, {
            id: album.id,
            albumThumbnailAssetId: thumbnailId,
          });
          album.albumThumbnailAssetId = thumbnailId;
        }

        // Get metadata
        const metadata = await this.dynamicAlbumRepository.getMetadata(
          album.filters as DynamicAlbumFilters,
          auth.user.id,
        );

        return {
          ...mapAlbum(album, withAssets, auth),
          assets: withAssets ? assets.map((asset) => mapAsset(asset)) : undefined,
          assetCount: metadata.assetCount,
          startDate: metadata.startDate ?? undefined,
          endDate: metadata.endDate ?? undefined,
          lastModifiedAssetTimestamp: metadata.lastModifiedAssetTimestamp ?? undefined,
          contributorCounts: isShared ? await this.albumRepository.getContributorCounts(album.id) : undefined,
        };
      } catch (error) {
        this.logger.error(`Error getting dynamic album ${id}: ${error}`);
        // Fallback to empty album
        return {
          ...mapAlbum(album, withAssets, auth),
          assets: [],
          assetCount: 0,
          contributorCounts: isShared ? await this.albumRepository.getContributorCounts(album.id) : undefined,
        };
      }
    }

    // Regular album logic (existing)
    const albumWithAssets = await this.findOrFail(id, { withAssets });
    const [albumMetadataForIds] = await this.albumRepository.getMetadataForIds([album.id]);

    return {
      ...mapAlbum(albumWithAssets, withAssets, auth),
      startDate: albumMetadataForIds?.startDate ?? undefined,
      endDate: albumMetadataForIds?.endDate ?? undefined,
      assetCount: albumMetadataForIds?.assetCount ?? 0,
      lastModifiedAssetTimestamp: albumMetadataForIds?.lastModifiedAssetTimestamp ?? undefined,
      contributorCounts: isShared ? await this.albumRepository.getContributorCounts(album.id) : undefined,
    };
  }

  async create(auth: AuthDto, dto: CreateAlbumDto): Promise<AlbumResponseDto> {
    const albumUsers = dto.albumUsers || [];

    // Validate dynamic album filters
    if (dto.dynamic && dto.filters) {
      const validation = validateDynamicAlbumFilters(dto.filters);
      if (!validation.isValid) {
        throw new BadRequestException(
          `Invalid filters: ${validation.errors.map((e) => e.message).join(', ')}`,
        );
      }
      // Sanitize filters
      dto.filters = sanitizeDynamicAlbumFilters(dto.filters);
    }

    // Dynamic albums cannot have manual assets
    if (dto.dynamic && dto.assetIds && dto.assetIds.length > 0) {
      throw new BadRequestException('Dynamic albums cannot have manually added assets');
    }

    // Dynamic albums must have filters
    if (dto.dynamic && !dto.filters) {
      throw new BadRequestException('Dynamic albums must have filters');
    }

    for (const { userId } of albumUsers) {
      const exists = await this.userRepository.get(userId, {});
      if (!exists) {
        throw new BadRequestException('User not found');
      }

      if (userId == auth.user.id) {
        throw new BadRequestException('Cannot share album with owner');
      }
    }

    const allowedAssetIdsSet = await this.checkAccess({
      auth,
      permission: Permission.AssetShare,
      ids: dto.assetIds || [],
    });
    const assetIds = [...allowedAssetIdsSet].map((id) => id);

    const userMetadata = await this.userRepository.getMetadata(auth.user.id);

    const album = await this.albumRepository.create(
      {
        ownerId: auth.user.id,
        albumName: dto.albumName,
        description: dto.description,
        albumThumbnailAssetId: assetIds[0] || null,
        order: getPreferences(userMetadata).albums.defaultAssetOrder,
        dynamic: dto.dynamic || false,
        filters: dto.filters || null,
      },
      assetIds,
      albumUsers,
    );

    for (const { userId } of albumUsers) {
      await this.eventRepository.emit('AlbumInvite', { id: album.id, userId });
    }

    return mapAlbumWithAssets(album);
  }

  async update(auth: AuthDto, id: string, dto: UpdateAlbumDto): Promise<AlbumResponseDto> {
    await this.requireAccess({ auth, permission: Permission.AlbumUpdate, ids: [id] });

    const album = await this.findOrFail(id, { withAssets: true });

    // Validate dynamic album filter updates
    if (dto.filters !== undefined) {
      if (dto.filters === null) {
        // Allow clearing filters (converting to non-dynamic)
        if (album.dynamic) {
          this.logger.warn(`Converting dynamic album ${id} to regular album by clearing filters`);
        }
      } else {
        const validation = validateDynamicAlbumFilters(dto.filters);
        if (!validation.isValid) {
          throw new BadRequestException(
            `Invalid filters: ${validation.errors.map((e) => e.message).join(', ')}`,
          );
        }
        // Sanitize filters
        dto.filters = sanitizeDynamicAlbumFilters(dto.filters);
      }
    }

    // If converting from regular to dynamic, ensure no assets are present
    if (dto.dynamic === true && !album.dynamic) {
      if (album.assets && album.assets.length > 0) {
        throw new BadRequestException('Cannot convert album with existing assets to dynamic album');
      }
      if (!dto.filters) {
        throw new BadRequestException('Dynamic albums must have filters');
      }
    }

    if (dto.albumThumbnailAssetId) {
      const results = await this.albumRepository.getAssetIds(id, [dto.albumThumbnailAssetId]);
      if (results.size === 0) {
        throw new BadRequestException('Invalid album thumbnail');
      }
    }

    const updatedAlbum = await this.albumRepository.update(album.id, {
      id: album.id,
      albumName: dto.albumName,
      description: dto.description,
      albumThumbnailAssetId: dto.albumThumbnailAssetId,
      isActivityEnabled: dto.isActivityEnabled,
      order: dto.order,
      dynamic: dto.dynamic,
      filters: dto.filters,
    });

    return mapAlbumWithoutAssets({ ...updatedAlbum, assets: album.assets });
  }

  async delete(auth: AuthDto, id: string): Promise<void> {
    await this.requireAccess({ auth, permission: Permission.AlbumDelete, ids: [id] });
    await this.albumRepository.delete(id);
  }

  async addAssets(auth: AuthDto, id: string, dto: BulkIdsDto): Promise<BulkIdResponseDto[]> {
    const album = await this.findOrFail(id, { withAssets: false });
    await this.requireAccess({ auth, permission: Permission.AlbumAssetCreate, ids: [id] });

    // Cannot add assets to dynamic albums
    if (album.dynamic) {
      throw new BadRequestException('Cannot manually add assets to dynamic albums');
    }

    const results = await addAssets(
      auth,
      { access: this.accessRepository, bulk: this.albumRepository },
      { parentId: id, assetIds: dto.ids },
    );

    const { id: firstNewAssetId } = results.find(({ success }) => success) || {};
    if (firstNewAssetId) {
      await this.albumRepository.update(id, {
        id,
        updatedAt: new Date(),
        albumThumbnailAssetId: album.albumThumbnailAssetId ?? firstNewAssetId,
      });

      const allUsersExceptUs = [...album.albumUsers.map(({ user }) => user.id), album.owner.id].filter(
        (userId) => userId !== auth.user.id,
      );

      for (const recipientId of allUsersExceptUs) {
        await this.eventRepository.emit('AlbumUpdate', { id, recipientId });
      }
    }

    return results;
  }

  async addAssetsToAlbums(auth: AuthDto, dto: AlbumsAddAssetsDto): Promise<AlbumsAddAssetsResponseDto> {
    const results: AlbumsAddAssetsResponseDto = {
      success: false,
      error: BulkIdErrorReason.DUPLICATE,
    };

    const allowedAlbumIds = await this.checkAccess({
      auth,
      permission: Permission.AlbumAssetCreate,
      ids: dto.albumIds,
    });
    if (allowedAlbumIds.size === 0) {
      results.error = BulkIdErrorReason.NO_PERMISSION;
      return results;
    }

    const allowedAssetIds = await this.checkAccess({ auth, permission: Permission.AssetShare, ids: dto.assetIds });
    if (allowedAssetIds.size === 0) {
      results.error = BulkIdErrorReason.NO_PERMISSION;
      return results;
    }

    const albumAssetValues: { albumId: string; assetId: string }[] = [];
    const events: { id: string; recipients: string[] }[] = [];
    for (const albumId of allowedAlbumIds) {
      const existingAssetIds = await this.albumRepository.getAssetIds(albumId, [...allowedAssetIds]);
      const notPresentAssetIds = [...allowedAssetIds].filter((id) => !existingAssetIds.has(id));
      if (notPresentAssetIds.length === 0) {
        continue;
      }
      const album = await this.findOrFail(albumId, { withAssets: false });
      results.error = undefined;
      results.success = true;

      for (const assetId of notPresentAssetIds) {
        albumAssetValues.push({ albumId, assetId });
      }
      await this.albumRepository.update(albumId, {
        id: albumId,
        updatedAt: new Date(),
        albumThumbnailAssetId: album.albumThumbnailAssetId ?? notPresentAssetIds[0],
      });
      const allUsersExceptUs = [...album.albumUsers.map(({ user }) => user.id), album.owner.id].filter(
        (userId) => userId !== auth.user.id,
      );
      events.push({ id: albumId, recipients: allUsersExceptUs });
    }

    await this.albumRepository.addAssetIdsToAlbums(albumAssetValues);
    for (const event of events) {
      for (const recipientId of event.recipients) {
        await this.eventRepository.emit('AlbumUpdate', { id: event.id, recipientId });
      }
    }

    return results;
  }

  async removeAssets(auth: AuthDto, id: string, dto: BulkIdsDto): Promise<BulkIdResponseDto[]> {
    await this.requireAccess({ auth, permission: Permission.AlbumAssetDelete, ids: [id] });

    const album = await this.findOrFail(id, { withAssets: false });

    // Cannot remove assets from dynamic albums
    if (album.dynamic) {
      throw new BadRequestException('Cannot manually remove assets from dynamic albums');
    }

    const results = await removeAssets(
      auth,
      { access: this.accessRepository, bulk: this.albumRepository },
      { parentId: id, assetIds: dto.ids, canAlwaysRemove: Permission.AlbumDelete },
    );

    const removedIds = results.filter(({ success }) => success).map(({ id }) => id);
    if (removedIds.length > 0 && album.albumThumbnailAssetId && removedIds.includes(album.albumThumbnailAssetId)) {
      await this.albumRepository.updateThumbnails();
    }

    return results;
  }

  async addUsers(auth: AuthDto, id: string, { albumUsers }: AddUsersDto): Promise<AlbumResponseDto> {
    await this.requireAccess({ auth, permission: Permission.AlbumShare, ids: [id] });

    const album = await this.findOrFail(id, { withAssets: false });

    for (const { userId, role } of albumUsers) {
      if (album.ownerId === userId) {
        throw new BadRequestException('Cannot be shared with owner');
      }

      const exists = album.albumUsers.find(({ user: { id } }) => id === userId);
      if (exists) {
        throw new BadRequestException('User already added');
      }

      const user = await this.userRepository.get(userId, {});
      if (!user) {
        throw new BadRequestException('User not found');
      }

      await this.albumUserRepository.create({ userId, albumId: id, role });
      await this.eventRepository.emit('AlbumInvite', { id, userId });
    }

    return this.findOrFail(id, { withAssets: true }).then(mapAlbumWithoutAssets);
  }

  async removeUser(auth: AuthDto, id: string, userId: string | 'me'): Promise<void> {
    if (userId === 'me') {
      userId = auth.user.id;
    }

    const album = await this.findOrFail(id, { withAssets: false });

    if (album.ownerId === userId) {
      throw new BadRequestException('Cannot remove album owner');
    }

    const exists = album.albumUsers.find(({ user: { id } }) => id === userId);
    if (!exists) {
      throw new BadRequestException('Album not shared with user');
    }

    // non-admin can remove themselves
    if (auth.user.id !== userId) {
      await this.requireAccess({ auth, permission: Permission.AlbumShare, ids: [id] });
    }

    await this.albumUserRepository.delete({ albumId: id, userId });
  }

  async updateUser(auth: AuthDto, id: string, userId: string, dto: UpdateAlbumUserDto): Promise<void> {
    await this.requireAccess({ auth, permission: Permission.AlbumShare, ids: [id] });
    await this.albumUserRepository.update({ albumId: id, userId }, { role: dto.role });
  }

  /**
   * Preview assets matching filters before creating album
   * Returns count and sample thumbnails
   */
  async previewDynamicAlbum(
    auth: AuthDto,
    filters: DynamicAlbumFilters,
  ): Promise<{ count: number; thumbnails: any[] }> {
    const validation = validateDynamicAlbumFilters(filters);
    if (!validation.isValid) {
      throw new BadRequestException(`Invalid filters: ${validation.errors.map((e) => e.message).join(', ')}`);
    }

    const sanitizedFilters = sanitizeDynamicAlbumFilters(filters);

    // Get first 10 assets as thumbnails
    const result = await this.dynamicAlbumRepository.getAssets(sanitizedFilters, auth.user.id, { size: 10 });

    // Get total count
    const metadata = await this.dynamicAlbumRepository.getMetadata(sanitizedFilters, auth.user.id);

    return {
      count: metadata.assetCount,
      thumbnails: result.items.map((asset) => mapAsset(asset)),
    };
  }

  /**
   * Validate dynamic album filters
   * Returns validation result with errors and warnings
   */
  async validateFilters(filters: DynamicAlbumFilters): Promise<DynamicAlbumFilterValidationResult> {
    return validateDynamicAlbumFilters(filters);
  }

  private async findOrFail(id: string, options: AlbumInfoOptions) {
    const album = await this.albumRepository.getById(id, options);
    if (!album) {
      throw new BadRequestException('Album not found');
    }
    return album;
  }
}
