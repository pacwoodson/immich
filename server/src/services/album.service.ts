import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AddUsersDto,
  AlbumInfoDto,
  AlbumResponseDto,
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
import { BulkIdResponseDto, BulkIdsDto } from 'src/dtos/asset-ids.response.dto';
import { AuthDto } from 'src/dtos/auth.dto';
import { Permission } from 'src/enum';
import { AlbumAssetCount, AlbumInfoOptions } from 'src/repositories/album.repository';
import { BaseService } from 'src/services/base.service';
import {
  DynamicAlbumFilters,
  DynamicAlbumMetadata,
  DynamicAlbumOperationOptions,
  DynamicAlbumSearchOptions,
} from 'src/types/dynamic-album.types';
import { FilterConversionResult } from 'src/types/search.types';
import { addAssets, removeAssets } from 'src/utils/asset.util';
import { getPreferences } from 'src/utils/preferences';

@Injectable()
export class AlbumService extends BaseService {
  private readonly filterCache = new Map<string, { result: FilterConversionResult; timestamp: number }>();

  async getStatistics({ user: { id: ownerId } }: AuthDto): Promise<AlbumStatisticsResponseDto> {
    const [owned, shared, notShared] = await Promise.all([
      this.albumRepository.getOwned(ownerId).then((albums) => albums.length),
      this.albumRepository.getShared(ownerId).then((albums) => albums.length),
      this.albumRepository.getNotShared(ownerId).then((albums) => albums.length),
    ]);
    return { owned, shared, notShared };
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

    // Get asset count for regular albums using the repository
    const regularAlbumIds = regularAlbums.map((album) => album.id);
    const results = regularAlbumIds.length > 0 ? await this.albumRepository.getMetadataForIds(regularAlbumIds) : [];
    const albumMetadata: Record<string, AlbumAssetCount> = {};
    for (const metadata of results) {
      albumMetadata[metadata.albumId] = metadata;
    }

    // Calculate metadata for dynamic albums using the centralized service
    for (const dynamicAlbum of dynamicAlbums) {
      if (dynamicAlbum.filters) {
        const metadata = await this.calculateMetadata(dynamicAlbum.filters as DynamicAlbumFilters, ownerId, {
          throwOnError: false,
        });

        // Update thumbnail if needed and no thumbnail is set
        if (!dynamicAlbum.albumThumbnailAssetId && metadata.assetCount > 0) {
          const thumbnailAssetId = await this.getThumbnailAssetId(
            dynamicAlbum.filters as DynamicAlbumFilters,
            ownerId,
            { throwOnError: false },
          );

          if (thumbnailAssetId) {
            await this.albumRepository.update(dynamicAlbum.id, {
              id: dynamicAlbum.id,
              albumThumbnailAssetId: thumbnailAssetId,
            });
            dynamicAlbum.albumThumbnailAssetId = thumbnailAssetId;
          }
        }

        albumMetadata[dynamicAlbum.id] = {
          albumId: dynamicAlbum.id,
          assetCount: metadata.assetCount,
          startDate: metadata.startDate,
          endDate: metadata.endDate,
          lastModifiedAssetTimestamp: metadata.lastModifiedAssetTimestamp,
        };
      } else {
        // No filters, so no assets
        albumMetadata[dynamicAlbum.id] = {
          albumId: dynamicAlbum.id,
          assetCount: 0,
          startDate: null,
          endDate: null,
          lastModifiedAssetTimestamp: null,
        };
      }
    }

    return albums.map((album) => ({
      ...mapAlbumWithoutAssets(album),
      sharedLinks: undefined,
      startDate: albumMetadata[album.id]?.startDate ?? undefined,
      endDate: albumMetadata[album.id]?.endDate ?? undefined,
      assetCount: albumMetadata[album.id]?.assetCount || 0,
      lastModifiedAssetTimestamp: albumMetadata[album.id]?.lastModifiedAssetTimestamp ?? undefined,
    }));
  }

  async get(auth: AuthDto, id: string, dto: AlbumInfoDto): Promise<AlbumResponseDto> {
    await this.requireAccess({ auth, permission: Permission.ALBUM_READ, ids: [id] });
    await this.albumRepository.updateThumbnails();
    const withAssets = dto.withoutAssets === undefined ? true : !dto.withoutAssets;
    const album = await this.findOrFail(id, { withAssets: false }); // Always load without assets first

    // Check if this is a dynamic album
    if (album.dynamic && album.filters) {
      // Use the centralized service to get assets and metadata
      const searchResult = await this.getAssetsForDynamicAlbum(
        album.filters as DynamicAlbumFilters,
        auth.user.id,
        { size: 50000, order: album.order },
        { throwOnError: false },
      );

      const foundAssets = searchResult.items || [];

      // Calculate metadata using the centralized service
      const metadata = await this.calculateMetadata(album.filters as DynamicAlbumFilters, auth.user.id, {
        throwOnError: false,
      });

      // Update thumbnail if needed
      if (!album.albumThumbnailAssetId && foundAssets.length > 0) {
        const thumbnailAssetId = foundAssets[0].id;
        await this.albumRepository.update(album.id, {
          id: album.id,
          albumThumbnailAssetId: thumbnailAssetId,
        });
        album.albumThumbnailAssetId = thumbnailAssetId;
      }

      return {
        ...mapAlbum({ ...album, assets: withAssets ? foundAssets : [] }, withAssets, auth),
        startDate: metadata.startDate ?? undefined,
        endDate: metadata.endDate ?? undefined,
        assetCount: metadata.assetCount,
        lastModifiedAssetTimestamp: metadata.lastModifiedAssetTimestamp ?? undefined,
      };
    }

    // For regular albums, use the existing logic
    const albumWithAssets = withAssets ? await this.findOrFail(id, { withAssets: true }) : album;
    const [albumMetadataForIds] = await this.albumRepository.getMetadataForIds([album.id]);

    return {
      ...mapAlbum(albumWithAssets, withAssets, auth),
      startDate: albumMetadataForIds?.startDate ?? undefined,
      endDate: albumMetadataForIds?.endDate ?? undefined,
      assetCount: albumMetadataForIds?.assetCount ?? 0,
      lastModifiedAssetTimestamp: albumMetadataForIds?.lastModifiedAssetTimestamp ?? undefined,
    };
  }

  async create(auth: AuthDto, dto: CreateAlbumDto): Promise<AlbumResponseDto> {
    const albumUsers = dto.albumUsers || [];

    for (const { userId } of albumUsers) {
      const exists = await this.userRepository.get(userId, {});
      if (!exists) {
        throw new BadRequestException('User not found');
      }

      if (userId == auth.user.id) {
        throw new BadRequestException('Cannot share album with owner');
      }
    }

    // For dynamic albums, we don't need to check asset access or add assets
    let assetIds: string[] = [];
    if (!dto.dynamic) {
      const allowedAssetIdsSet = await this.checkAccess({
        auth,
        permission: Permission.ASSET_SHARE,
        ids: dto.assetIds || [],
      });
      assetIds = [...allowedAssetIdsSet].map((id) => id);
    }

    const userMetadata = await this.userRepository.getMetadata(auth.user.id);

    // For dynamic albums, get the first asset that matches the filters to use as thumbnail
    let dynamicAlbumThumbnailAssetId = null;
    if (dto.dynamic && dto.filters) {
      try {
        // Use  to get thumbnail asset
        dynamicAlbumThumbnailAssetId = await this.getThumbnailAssetId(dto.filters, auth.user.id, {
          throwOnError: false, // Don't throw on thumbnail selection errors
          timeout: 10000, // 10 second timeout for thumbnail selection
        });
      } catch (error) {
        this.logger.warn('Failed to get thumbnail for dynamic album:', error);
        // Continue without thumbnail - will be set later if needed
      }
    }

    const album = await this.albumRepository.create(
      {
        ownerId: auth.user.id,
        albumName: dto.albumName,
        description: dto.description,
        albumThumbnailAssetId: dto.dynamic ? dynamicAlbumThumbnailAssetId : assetIds[0] || null,
        order: getPreferences(userMetadata).albums.defaultAssetOrder,
        dynamic: dto.dynamic || false,
        filters: dto.filters || null,
      },
      dto.dynamic ? [] : assetIds, // Don't add assets for dynamic albums
      albumUsers,
    );

    for (const { userId } of albumUsers) {
      await this.eventRepository.emit('album.invite', { id: album.id, userId });
    }

    return mapAlbumWithAssets(album);
  }

  async update(auth: AuthDto, id: string, dto: UpdateAlbumDto): Promise<AlbumResponseDto> {
    await this.requireAccess({ auth, permission: Permission.ALBUM_UPDATE, ids: [id] });

    const album = await this.findOrFail(id, { withAssets: false });

    if (dto.albumThumbnailAssetId) {
      // For regular albums, validate thumbnail asset exists in album
      if (!album.dynamic) {
        const results = await this.albumRepository.getAssetIds(id, [dto.albumThumbnailAssetId]);
        if (results.size === 0) {
          throw new BadRequestException('Invalid album thumbnail');
        }
      } else {
        // For dynamic albums, validate thumbnail asset matches current filters
        if (album.filters) {
          const isValid = await this.validateThumbnail(id, dto.albumThumbnailAssetId, album.filters, auth.user.id, {
            throwOnError: false, // Don't throw, we'll handle validation ourselves
            timeout: 10000, // 10 second timeout for validation
          });

          if (!isValid) {
            throw new BadRequestException('Invalid album thumbnail - asset does not match album filters');
          }
        }
      }
    }

    // For dynamic albums, handle thumbnail updates when filters change
    let finalAlbumThumbnailAssetId = dto.albumThumbnailAssetId;

    if (album.dynamic && dto.filters && JSON.stringify(dto.filters) !== JSON.stringify(album.filters)) {
      try {
        const updatedThumbnailId = await this.updateThumbnailIfNeeded(
          id,
          dto.filters,
          dto.albumThumbnailAssetId ?? null, // Convert undefined to null for the method
          auth.user.id,
          {
            throwOnError: true, // Throw on filter validation errors
            timeout: 15000, // 15 second timeout for filter processing
          },
        );
        finalAlbumThumbnailAssetId = updatedThumbnailId ?? undefined; // Convert null back to undefined
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error; // Re-throw validation errors
        }
        this.logger.error('Failed to update thumbnail for dynamic album:', error);
        throw new BadRequestException('Failed to process album filters');
      }
    }

    const updatedAlbum = await this.albumRepository.update(album.id, {
      id: album.id,
      albumName: dto.albumName,
      description: dto.description,
      albumThumbnailAssetId: finalAlbumThumbnailAssetId,
      isActivityEnabled: dto.isActivityEnabled,
      order: dto.order,
      dynamic: dto.dynamic ?? album.dynamic,
      filters: dto.filters ?? album.filters,
    });

    // For dynamic albums, return empty assets for now
    // TODO: Implement proper dynamic album asset retrieval
    if (updatedAlbum.dynamic) {
      return mapAlbumWithoutAssets({ ...updatedAlbum, assets: [] });
    }

    return mapAlbumWithoutAssets({ ...updatedAlbum, assets: album.assets });
  }

  async delete(auth: AuthDto, id: string): Promise<void> {
    await this.requireAccess({ auth, permission: Permission.ALBUM_DELETE, ids: [id] });
    await this.albumRepository.delete(id);
  }

  async addAssets(auth: AuthDto, id: string, dto: BulkIdsDto): Promise<BulkIdResponseDto[]> {
    const album = await this.findOrFail(id, { withAssets: false });

    // Prevent adding assets to dynamic albums
    if (album.dynamic) {
      throw new BadRequestException(
        'Cannot add assets to dynamic albums. Assets are automatically populated based on filters.',
      );
    }

    await this.requireAccess({ auth, permission: Permission.ALBUM_ADD_ASSET, ids: [id] });

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
        await this.eventRepository.emit('album.update', { id, recipientId });
      }
    }

    return results;
  }

  async removeAssets(auth: AuthDto, id: string, dto: BulkIdsDto): Promise<BulkIdResponseDto[]> {
    const album = await this.findOrFail(id, { withAssets: false });

    // Prevent removing assets from dynamic albums
    if (album.dynamic) {
      throw new BadRequestException(
        'Cannot remove assets from dynamic albums. Assets are automatically populated based on filters.',
      );
    }

    await this.requireAccess({ auth, permission: Permission.ALBUM_REMOVE_ASSET, ids: [id] });

    const results = await removeAssets(
      auth,
      { access: this.accessRepository, bulk: this.albumRepository },
      { parentId: id, assetIds: dto.ids, canAlwaysRemove: Permission.ALBUM_DELETE },
    );

    const removedIds = results.filter(({ success }) => success).map(({ id }) => id);
    if (removedIds.length > 0 && album.albumThumbnailAssetId && removedIds.includes(album.albumThumbnailAssetId)) {
      await this.albumRepository.updateThumbnails();
    }

    return results;
  }

  async addUsers(auth: AuthDto, id: string, { albumUsers }: AddUsersDto): Promise<AlbumResponseDto> {
    await this.requireAccess({ auth, permission: Permission.ALBUM_SHARE, ids: [id] });

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

      await this.albumUserRepository.create({ usersId: userId, albumsId: id, role });
      await this.eventRepository.emit('album.invite', { id, userId });
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
      await this.requireAccess({ auth, permission: Permission.ALBUM_SHARE, ids: [id] });
    }

    await this.albumUserRepository.delete({ albumsId: id, usersId: userId });
  }

  async updateUser(auth: AuthDto, id: string, userId: string, dto: UpdateAlbumUserDto): Promise<void> {
    await this.requireAccess({ auth, permission: Permission.ALBUM_SHARE, ids: [id] });
    await this.albumUserRepository.update({ albumsId: id, usersId: userId }, { role: dto.role });
  }

  private async findOrFail(id: string, options: AlbumInfoOptions) {
    const album = await this.albumRepository.getById(id, options);
    if (!album) {
      throw new BadRequestException('Album not found');
    }
    return album;
  }

  // Dynamic Album Methods

  /**
   * Get assets for a dynamic album with comprehensive options
   */
  async getAssetsForDynamicAlbum(
    filters: DynamicAlbumFilters,
    ownerId: string,
    options: DynamicAlbumSearchOptions = {},
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<any> {
    return this.dynamicAlbumRepository.getAssets(filters, ownerId, options, operationOptions);
  }

  /**
   * Calculate metadata for a dynamic album
   */
  async calculateMetadata(
    filters: DynamicAlbumFilters,
    ownerId: string,
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<DynamicAlbumMetadata> {
    return this.dynamicAlbumRepository.getMetadata(filters, ownerId, operationOptions);
  }

  /**
   * Get thumbnail asset ID for a dynamic album
   */
  async getThumbnailAssetId(
    filters: DynamicAlbumFilters,
    ownerId: string,
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<string | null> {
    return this.dynamicAlbumRepository.getThumbnailAssetId(filters, ownerId, operationOptions);
  }

  /**
   * Validate that a thumbnail asset belongs to a dynamic album
   */
  async validateThumbnail(
    albumId: string,
    thumbnailId: string,
    filters: DynamicAlbumFilters,
    ownerId: string,
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<boolean> {
    const operation = async (): Promise<boolean> => {
      // Use the efficient method to check if the specific asset matches the filters
      return this.dynamicAlbumRepository.isAssetInDynamicAlbum(thumbnailId, filters, ownerId, operationOptions);
    };

    return this.executeSafely(operation, `validate thumbnail for dynamic album ${albumId}`, false, operationOptions);
  }

  /**
   * Update thumbnail if needed for a dynamic album
   */
  async updateThumbnailIfNeeded(
    albumId: string,
    filters: DynamicAlbumFilters,
    currentThumbnailId: string | null,
    ownerId: string,
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<string | null> {
    const operation = async (): Promise<string | null> => {
      // If we already have a valid thumbnail, keep it
      if (currentThumbnailId) {
        const isValid = await this.validateThumbnail(albumId, currentThumbnailId, filters, ownerId, operationOptions);
        if (isValid) {
          return currentThumbnailId;
        }
      }

      // Get a new thumbnail
      const newThumbnailId = await this.getThumbnailAssetId(filters, ownerId, operationOptions);
      if (newThumbnailId) {
        await this.albumRepository.update(albumId, {
          id: albumId,
          albumThumbnailAssetId: newThumbnailId,
        });
      }

      return newThumbnailId;
    };

    return this.executeSafely(
      operation,
      `update thumbnail for dynamic album ${albumId}`,
      currentThumbnailId,
      operationOptions,
    );
  }

  /**
   * Get search options for a dynamic album
   */
  async getSearchOptionsForDynamicAlbum(
    filters: DynamicAlbumFilters,
    ownerId: string,
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<any> {
    return this.dynamicAlbumRepository.getSearchOptions(filters, ownerId, operationOptions);
  }

  private async executeSafely<T>(
    operation: () => Promise<T>,
    operationName: string,
    defaultValue: T,
    options: DynamicAlbumOperationOptions = {},
  ): Promise<T> {
    try {
      const timeout = options.timeout ?? 30000; // 30 seconds default timeout

      if (timeout > 0) {
        return await Promise.race([
          operation(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`${operationName} timed out after ${timeout}ms`)), timeout),
          ),
        ]);
      }

      return await operation();
    } catch (error) {
      this.logger.error(`Error in ${operationName}:`, error);

      if (options.throwOnError) {
        throw error;
      }

      return defaultValue;
    }
  }
}
