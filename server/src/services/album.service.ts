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
import { DynamicAlbumService } from 'src/services/dynamic-album.service';
import { DynamicAlbumFilters } from 'src/types/dynamic-album.types';
import { addAssets, removeAssets } from 'src/utils/asset.util';
import { FilterUtil } from 'src/utils/filter.util';
import { getPreferences } from 'src/utils/preferences';

@Injectable()
export class AlbumService extends BaseService {
  constructor(
    private dynamicAlbumService: DynamicAlbumService,
    ...args: ConstructorParameters<typeof BaseService>
  ) {
    super(...args);
  }

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
        const metadata = await this.dynamicAlbumService.calculateMetadata(
          dynamicAlbum.filters as DynamicAlbumFilters,
          ownerId,
          { throwOnError: false },
        );

        // Update thumbnail if needed and no thumbnail is set
        if (!dynamicAlbum.albumThumbnailAssetId && metadata.assetCount > 0) {
          const thumbnailAssetId = await this.dynamicAlbumService.getThumbnailAssetId(
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
      const searchResult = await this.dynamicAlbumService.getAssetsForDynamicAlbum(
        album.filters as DynamicAlbumFilters,
        auth.user.id,
        { size: 50000, order: album.order },
        { throwOnError: false },
      );

      const foundAssets = searchResult.items || [];

      // Calculate metadata using the centralized service
      const metadata = await this.dynamicAlbumService.calculateMetadata(
        album.filters as DynamicAlbumFilters,
        auth.user.id,
        { throwOnError: false },
      );

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
        const searchOptions = FilterUtil.convertFiltersToSearchOptions(dto.filters, auth.user.id);
        const searchResult = await this.searchRepository.searchMetadata(
          { page: 1, size: 1 }, // Just get the first asset
          {
            ...searchOptions,
            orderDirection: getPreferences(userMetadata).albums.defaultAssetOrder === 'asc' ? 'asc' : 'desc',
          },
        );
        if (searchResult.items.length > 0) {
          dynamicAlbumThumbnailAssetId = searchResult.items[0].id;
        }
      } catch (error) {
        // If search fails, continue without thumbnail
        this.logger.warn(`Failed to get thumbnail for dynamic album: ${error}`);
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
          const searchOptions = FilterUtil.convertFiltersToSearchOptions(album.filters, auth.user.id);
          const searchResult = await this.searchRepository.searchMetadata(
            { page: 1, size: 50000 },
            { ...searchOptions, orderDirection: album.order === 'asc' ? 'asc' : 'desc' },
          );
          const assetIds = searchResult.items.map((asset: any) => asset.id);
          if (!assetIds.includes(dto.albumThumbnailAssetId)) {
            throw new BadRequestException('Invalid album thumbnail - asset does not match album filters');
          }
        }
      }
    }

    // For dynamic albums, handle thumbnail updates when filters change
    let finalAlbumThumbnailAssetId = dto.albumThumbnailAssetId;

    if (album.dynamic && dto.filters && JSON.stringify(dto.filters) !== JSON.stringify(album.filters)) {
      // Filters have changed, check if current thumbnail is still valid
      const searchOptions = FilterUtil.convertFiltersToSearchOptions(dto.filters, auth.user.id);
      const searchResult = await this.searchRepository.searchMetadata(
        { page: 1, size: 50000 },
        { ...searchOptions, orderDirection: album.order === 'asc' ? 'asc' : 'desc' },
      );
      const assetIds = searchResult.items.map((asset: any) => asset.id);

      // If current thumbnail is no longer in the album, set it to the first asset
      if (album.albumThumbnailAssetId && !assetIds.includes(album.albumThumbnailAssetId)) {
        finalAlbumThumbnailAssetId = assetIds.length > 0 ? assetIds[0] : null;
      } else if (!album.albumThumbnailAssetId && assetIds.length > 0) {
        // If no thumbnail was set and we have assets, set the first one
        finalAlbumThumbnailAssetId = assetIds[0];
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
}
