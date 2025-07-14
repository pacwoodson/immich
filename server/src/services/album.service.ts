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

    // Get asset count for regular albums using the repository
    const regularAlbumIds = regularAlbums.map((album) => album.id);
    const results = regularAlbumIds.length > 0 ? await this.albumRepository.getMetadataForIds(regularAlbumIds) : [];
    const albumMetadata: Record<string, AlbumAssetCount> = {};
    for (const metadata of results) {
      albumMetadata[metadata.albumId] = metadata;
    }

    // Calculate metadata for dynamic albums using search
    for (const dynamicAlbum of dynamicAlbums) {
      if (dynamicAlbum.filters) {
        try {
          const searchOptions = this.convertFiltersToSearchOptions(dynamicAlbum.filters, ownerId);
          const searchResult = await this.searchRepository.searchMetadata(
            { page: 1, size: 50000 }, // Large page size to get all matching assets
            { ...searchOptions, orderDirection: dynamicAlbum.order === 'asc' ? 'asc' : 'desc' },
          );

          const assets = searchResult.items;

          if (assets.length > 0) {
            const dates = assets
              .map((asset: any) => asset.fileCreatedAt || asset.localDateTime)
              .filter(Boolean)
              .map((date: any) => new Date(date))
              .sort((a: Date, b: Date) => a.getTime() - b.getTime());

            const updatedDates = assets
              .map((asset: any) => asset.updatedAt)
              .filter(Boolean)
              .map((date: any) => new Date(date))
              .sort((a: Date, b: Date) => b.getTime() - a.getTime());

            albumMetadata[dynamicAlbum.id] = {
              albumId: dynamicAlbum.id,
              assetCount: assets.length,
              startDate: dates.length > 0 ? dates[0] : null,
              endDate: dates.length > 0 ? dates[dates.length - 1] : null,
              lastModifiedAssetTimestamp: updatedDates.length > 0 ? updatedDates[0] : null,
            };
          } else {
            albumMetadata[dynamicAlbum.id] = {
              albumId: dynamicAlbum.id,
              assetCount: 0,
              startDate: null,
              endDate: null,
              lastModifiedAssetTimestamp: null,
            };
          }
        } catch (error) {
          // If search fails, use empty metadata
          albumMetadata[dynamicAlbum.id] = {
            albumId: dynamicAlbum.id,
            assetCount: 0,
            startDate: null,
            endDate: null,
            lastModifiedAssetTimestamp: null,
          };
        }
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
      assetCount: albumMetadata[album.id]?.assetCount ?? 0,
      // lastModifiedAssetTimestamp is only used in mobile app, please remove if not need
      lastModifiedAssetTimestamp: albumMetadata[album.id]?.lastModifiedAssetTimestamp ?? undefined,
    }));
  }

  async get(auth: AuthDto, id: string, dto: AlbumInfoDto): Promise<AlbumResponseDto> {
    // throw new Error('Not implemented');
    this.logger.debug(`AlbumService.get called with id: ${id}, withoutAssets: ${dto.withoutAssets}`);
    await this.requireAccess({ auth, permission: Permission.ALBUM_READ, ids: [id] });
    await this.albumRepository.updateThumbnails();
    const withAssets = dto.withoutAssets === undefined ? true : !dto.withoutAssets;
    const album = await this.findOrFail(id, { withAssets: false }); // Always load without assets first

    this.logger.debug(
      `Album data loaded: ${JSON.stringify(
        {
          id: album.id,
          dynamic: album.dynamic,
          filters: album.filters,
          albumName: album.albumName,
        },
        null,
        2,
      )}`,
    );

    // Check if this is a dynamic album
    this.logger.debug(`Album check - dynamic: ${album.dynamic}, filters: ${!!album.filters}`);
    if (album.dynamic && album.filters) {
      this.logger.debug('Processing dynamic album - entering logic');
      // Convert album filters to search options for SearchRepository
      const dynamicSearchOptions = this.convertFiltersToSearchOptions(album.filters, auth.user.id);

      // Always get the search result to calculate metadata, even if we don't need full assets
      const searchResult = await this.searchRepository.searchMetadata(
        { page: 1, size: 50000 }, // Large page size to get all matching assets
        { ...dynamicSearchOptions, orderDirection: album.order === 'asc' ? 'asc' : 'desc' },
      );

      const foundAssets = searchResult.items;
      this.logger.debug(`Found ${foundAssets.length} assets for dynamic album`);

      // For dynamic albums, calculate metadata from the actual search results
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      let lastModifiedAssetTimestamp: Date | undefined;

      if (foundAssets.length > 0) {
        const dates = foundAssets
          .map((asset: any) => asset.fileCreatedAt || asset.localDateTime)
          .filter(Boolean)
          .map((date: any) => new Date(date))
          .sort((a: Date, b: Date) => a.getTime() - b.getTime());

        if (dates.length > 0) {
          startDate = dates[0];
          endDate = dates[dates.length - 1];
        }

        const updatedDates = foundAssets
          .map((asset: any) => asset.updatedAt)
          .filter(Boolean)
          .map((date: any) => new Date(date))
          .sort((a: Date, b: Date) => b.getTime() - a.getTime());

        if (updatedDates.length > 0) {
          lastModifiedAssetTimestamp = updatedDates[0];
        }
      }

      return {
        ...mapAlbum({ ...album, assets: withAssets ? foundAssets : [] }, withAssets, auth),
        startDate,
        endDate,
        assetCount: foundAssets.length,
        lastModifiedAssetTimestamp,
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

    const album = await this.albumRepository.create(
      {
        ownerId: auth.user.id,
        albumName: dto.albumName,
        description: dto.description,
        albumThumbnailAssetId: dto.dynamic ? null : assetIds[0] || null,
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

    // For dynamic albums, don't allow setting thumbnail from assets
    if (dto.albumThumbnailAssetId && !album.dynamic) {
      const results = await this.albumRepository.getAssetIds(id, [dto.albumThumbnailAssetId]);
      if (results.size === 0) {
        throw new BadRequestException('Invalid album thumbnail');
      }
    }

    // For dynamic albums, clear thumbnail if trying to set one
    const albumThumbnailAssetId = album.dynamic ? null : dto.albumThumbnailAssetId;

    const updatedAlbum = await this.albumRepository.update(album.id, {
      id: album.id,
      albumName: dto.albumName,
      description: dto.description,
      albumThumbnailAssetId: albumThumbnailAssetId,
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

  /**
   * Convert dynamic album filters to search options for SearchRepository
   */
  private convertFiltersToSearchOptions(filters: any, userId: string): any {
    const searchOptions: any = {
      userIds: [userId],
      withDeleted: false,
    };

    // Handle the actual filter structure: {tags: [...], operator: "and", ...}
    if (filters.tags && Array.isArray(filters.tags)) {
      searchOptions.tagIds = filters.tags;
      // Include the operator for tag filtering
      if (filters.operator) {
        searchOptions.tagOperator = filters.operator;
      }
    }

    if (filters.people && Array.isArray(filters.people)) {
      searchOptions.personIds = filters.people;
    }

    if (filters.location) {
      if (typeof filters.location === 'string') {
        searchOptions.city = filters.location;
      } else if (typeof filters.location === 'object') {
        if (filters.location.city) searchOptions.city = filters.location.city;
        if (filters.location.state) searchOptions.state = filters.location.state;
        if (filters.location.country) searchOptions.country = filters.location.country;
      }
    }

    if (filters.dateRange && typeof filters.dateRange === 'object') {
      if (filters.dateRange.start) {
        searchOptions.takenAfter = new Date(filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        searchOptions.takenBefore = new Date(filters.dateRange.end);
      }
    }

    if (filters.assetType) {
      if (filters.assetType === 'IMAGE' || filters.assetType === 'VIDEO') {
        searchOptions.type = filters.assetType;
      }
    }

    if (filters.metadata && typeof filters.metadata === 'object') {
      if (filters.metadata.isFavorite !== undefined) {
        searchOptions.isFavorite = filters.metadata.isFavorite;
      }
      if (filters.metadata.make) searchOptions.make = filters.metadata.make;
      if (filters.metadata.model) searchOptions.model = filters.metadata.model;
      if (filters.metadata.lensModel) searchOptions.lensModel = filters.metadata.lensModel;
      if (filters.metadata.rating !== undefined) searchOptions.rating = filters.metadata.rating;
    }

    return searchOptions;
  }

  private async findOrFail(id: string, options: AlbumInfoOptions) {
    const album = await this.albumRepository.getById(id, options);
    if (!album) {
      throw new BadRequestException('Album not found');
    }
    return album;
  }
}
