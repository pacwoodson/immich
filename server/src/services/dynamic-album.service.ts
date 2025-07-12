import { BadRequestException, Injectable } from '@nestjs/common';
import { mapAsset } from 'src/dtos/asset-response.dto';
import { AuthDto } from 'src/dtos/auth.dto';
import {
    CreateDynamicAlbumDto,
    DynamicAlbumResponseDto,
    ShareDynamicAlbumDto,
    UpdateDynamicAlbumDto,
    UpdateDynamicAlbumShareDto,
} from 'src/dtos/dynamic-album.dto';

import { DynamicAlbumFilterRepository } from 'src/repositories/dynamic-album-filter.repository';
import { DynamicAlbumShareRepository } from 'src/repositories/dynamic-album-share.repository';
import { DynamicAlbumRepository } from 'src/repositories/dynamic-album.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { getPreferences } from 'src/utils/preferences';

@Injectable()
export class DynamicAlbumService {
  constructor(
    private dynamicAlbumRepository: DynamicAlbumRepository,
    private dynamicAlbumFilterRepository: DynamicAlbumFilterRepository,
    private dynamicAlbumShareRepository: DynamicAlbumShareRepository,
    private userRepository: UserRepository,
  ) {}

  async getAll(auth: AuthDto): Promise<DynamicAlbumResponseDto[]> {
    const [owned, shared] = await Promise.all([
      this.dynamicAlbumRepository.getOwned(auth.user.id),
      this.dynamicAlbumRepository.getShared(auth.user.id),
    ]);

    const allAlbums = [...owned, ...shared];
    const results = await this.dynamicAlbumRepository.getMetadataForIds(allAlbums.map((album) => album.id));
    const albumMetadata: Record<string, any> = {};
    for (const metadata of results) {
      albumMetadata[metadata.dynamicAlbumId] = metadata;
    }

    // Get thumbnail asset IDs for albums without manual thumbnails
    const albumsWithoutThumbnails = allAlbums.filter((album) => !album.albumThumbnailAssetId);
    const thumbnailAssetIds = await Promise.all(
      albumsWithoutThumbnails.map(async (album) => {
        const assetId = await this.dynamicAlbumRepository.getFirstAssetForThumbnail(album.id);
        return { albumId: album.id, assetId };
      }),
    );

    const thumbnailMap = new Map(thumbnailAssetIds.map(({ albumId, assetId }) => [albumId, assetId]));

    return allAlbums.map((album) => ({
      id: album.id,
      name: album.name,
      description: album.description,
      ownerId: album.ownerId,
      filters: (album.filters || []).map((filter: any) => ({
        type: filter.filterType,
        value: filter.filterValue,
      })),
      assetCount: albumMetadata[album.id]?.assetCount ?? 0,
      startDate: albumMetadata[album.id]?.startDate ?? undefined,
      endDate: albumMetadata[album.id]?.endDate ?? undefined,
      albumThumbnailAssetId: album.albumThumbnailAssetId ?? thumbnailMap.get(album.id) ?? undefined,
      order: album.order,
      isActivityEnabled: album.isActivityEnabled,
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
      sharedUsers: (album.sharedUsers || []).map((share: any) => ({
        userId: share.user?.id,
        role: share.role,
        createdAt: share.createdAt,
      })),
    }));
  }

  async getShared(auth: AuthDto): Promise<DynamicAlbumResponseDto[]> {
    const sharedAlbums = await this.dynamicAlbumRepository.getShared(auth.user.id);

    const results = await this.dynamicAlbumRepository.getMetadataForIds(sharedAlbums.map((album) => album.id));
    const albumMetadata: Record<string, any> = {};
    for (const metadata of results) {
      albumMetadata[metadata.dynamicAlbumId] = metadata;
    }

    // Get thumbnail asset IDs for albums without manual thumbnails
    const albumsWithoutThumbnails = sharedAlbums.filter((album) => !album.albumThumbnailAssetId);
    const thumbnailAssetIds = await Promise.all(
      albumsWithoutThumbnails.map(async (album) => {
        const assetId = await this.dynamicAlbumRepository.getFirstAssetForThumbnail(album.id);
        return { albumId: album.id, assetId };
      }),
    );

    const thumbnailMap = new Map(thumbnailAssetIds.map(({ albumId, assetId }) => [albumId, assetId]));

    return sharedAlbums.map((album) => ({
      id: album.id,
      name: album.name,
      description: album.description,
      ownerId: album.ownerId,
      filters: (album.filters || []).map((filter: any) => ({
        type: filter.filterType,
        value: filter.filterValue,
      })),
      assetCount: albumMetadata[album.id]?.assetCount ?? 0,
      startDate: albumMetadata[album.id]?.startDate ?? undefined,
      endDate: albumMetadata[album.id]?.endDate ?? undefined,
      albumThumbnailAssetId: album.albumThumbnailAssetId ?? thumbnailMap.get(album.id) ?? undefined,
      order: album.order,
      isActivityEnabled: album.isActivityEnabled,
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
      sharedUsers: (album.sharedUsers || []).map((share: any) => ({
        userId: share.user?.id,
        role: share.role,
        createdAt: share.createdAt,
      })),
    }));
  }

  async get(auth: AuthDto, id: string): Promise<DynamicAlbumResponseDto> {
    const album = await this.dynamicAlbumRepository.getById(id);
    if (!album) {
      throw new BadRequestException('Dynamic album not found');
    }

    const [albumMetadata] = await this.dynamicAlbumRepository.getMetadataForIds([album.id]);

    // Get thumbnail asset ID if no manual thumbnail is set
    let thumbnailAssetId = album.albumThumbnailAssetId;
    if (!thumbnailAssetId) {
      thumbnailAssetId = await this.dynamicAlbumRepository.getFirstAssetForThumbnail(album.id);
    }

    return {
      id: album.id,
      name: album.name,
      description: album.description,
      ownerId: album.ownerId,
      filters: (album.filters || []).map((filter: any) => ({
        type: filter.filterType,
        value: filter.filterValue,
      })),
      assetCount: albumMetadata?.assetCount ?? 0,
      startDate: albumMetadata?.startDate ?? undefined,
      endDate: albumMetadata?.endDate ?? undefined,
      albumThumbnailAssetId: thumbnailAssetId ?? undefined,
      order: album.order,
      isActivityEnabled: album.isActivityEnabled,
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
      sharedUsers: (album.sharedUsers || []).map((share: any) => ({
        userId: share.user?.id,
        role: share.role,
        createdAt: share.createdAt,
      })),
    };
  }

  async create(auth: AuthDto, dto: CreateDynamicAlbumDto): Promise<DynamicAlbumResponseDto> {
    const userMetadata = await this.userRepository.getMetadata(auth.user.id);

    const dynamicAlbum = await this.dynamicAlbumRepository.create({
      ownerId: auth.user.id,
      name: dto.name,
      description: dto.description || '',
      order: dto.order || getPreferences(userMetadata).albums.defaultAssetOrder,
      isActivityEnabled: dto.isActivityEnabled ?? true,
    });

    // Create filters
    if (dto.filters && dto.filters.length > 0) {
      const filters = dto.filters.map((filter) => ({
        dynamicAlbumId: dynamicAlbum.id,
        filterType: filter.type,
        filterValue: filter.value,
      }));
      await this.dynamicAlbumFilterRepository.createMany(filters);
    }

    return this.get(auth, dynamicAlbum.id);
  }

  async update(auth: AuthDto, id: string, dto: UpdateDynamicAlbumDto): Promise<DynamicAlbumResponseDto> {
    const album = await this.dynamicAlbumRepository.getById(id);
    if (!album) {
      throw new BadRequestException('Dynamic album not found');
    }

    const updateData: any = {};
    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }
    if (dto.order !== undefined) {
      updateData.order = dto.order;
    }
    if (dto.isActivityEnabled !== undefined) {
      updateData.isActivityEnabled = dto.isActivityEnabled;
    }
    if (dto.albumThumbnailAssetId !== undefined) {
      updateData.albumThumbnailAssetId = dto.albumThumbnailAssetId;
    }

    await this.dynamicAlbumRepository.update(id, updateData);

    // Update filters if provided
    if (dto.filters !== undefined) {
      const filters = dto.filters.map((filter) => ({
        dynamicAlbumId: id,
        filterType: filter.type,
        filterValue: filter.value,
      }));
      await this.dynamicAlbumFilterRepository.updateByDynamicAlbumId(id, filters);
    }

    return this.get(auth, id);
  }

  async delete(auth: AuthDto, id: string): Promise<void> {
    await this.dynamicAlbumRepository.delete(id);
  }

  async share(auth: AuthDto, id: string, dto: ShareDynamicAlbumDto): Promise<void> {
    const exists = await this.userRepository.get(dto.userId, {});
    if (!exists) {
      throw new BadRequestException('User not found');
    }

    if (dto.userId === auth.user.id) {
      throw new BadRequestException('Cannot share dynamic album with owner');
    }

    await this.dynamicAlbumShareRepository.create({
      dynamicAlbumId: id,
      userId: dto.userId,
      role: dto.role,
    });
  }

  async updateShare(auth: AuthDto, id: string, userId: string, dto: UpdateDynamicAlbumShareDto): Promise<void> {
    await this.dynamicAlbumShareRepository.update(id, userId, { role: dto.role });
  }

  async removeShare(auth: AuthDto, id: string, userId: string): Promise<void> {
    await this.dynamicAlbumShareRepository.delete(id, userId);
  }

  async getAssets(auth: AuthDto, id: string, options: { skip?: number; take?: number } = {}): Promise<any[]> {
    const assets = await this.dynamicAlbumRepository.getAssets(id, options);
    return assets.map((asset) => mapAsset(asset, { auth }));
  }

  async getAssetsByTimeBucket(auth: AuthDto, id: string, timeBucket: string): Promise<any[]> {
    // Parse the time bucket (format: YYYY-MM-DD)
    const [year, month] = timeBucket.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1); // First day of the month
    const endDate = new Date(year, month, 0); // Last day of the month
    
    // Get all assets for the dynamic album and filter by time bucket
    const assets = await this.dynamicAlbumRepository.getAssets(id, {});
    
    // Filter assets by the time bucket
    const filteredAssets = assets.filter((asset) => {
      if (!asset.fileCreatedAt) return false;
      const assetDate = new Date(asset.fileCreatedAt);
      return assetDate >= startDate && assetDate <= endDate;
    });
    
    return filteredAssets.map((asset) => mapAsset(asset, { auth }));
  }

  async getAssetCount(auth: AuthDto, id: string): Promise<number> {
    return this.dynamicAlbumRepository.getAssetCount(id);
  }
}
