import { BadRequestException, Injectable } from '@nestjs/common';
import { DYNAMIC_ALBUM_CONFIG } from 'src/config/dynamic-albums.config';
import { AssetOrder } from 'src/enum';
import { BaseService } from 'src/services/base.service';
import {
  DynamicAlbumFilters,
  DynamicAlbumMetadata,
  DynamicAlbumOperationOptions,
  DynamicAlbumSearchOptions,
} from 'src/types/dynamic-album.types';
import { FilterUtil } from 'src/utils/filter.util';

@Injectable()
export class DynamicAlbumService extends BaseService {
  private readonly filterCache = new Map<string, { result: any; timestamp: number }>();

  /**
   * Get assets for a dynamic album with comprehensive options
   */
  async getAssetsForDynamicAlbum(
    filters: DynamicAlbumFilters,
    ownerId: string,
    options: DynamicAlbumSearchOptions = {},
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<any> {
    const operation = async () => {
      const searchOptions = this.convertFiltersToSearchOptions(filters, ownerId, operationOptions.useCache);

      return await this.searchRepository.searchMetadata(
        {
          page: options.page ?? 1,
          size: Math.min(
            options.size ?? DYNAMIC_ALBUM_CONFIG.DEFAULT_SEARCH_SIZE,
            DYNAMIC_ALBUM_CONFIG.MAX_SEARCH_SIZE,
          ),
        },
        {
          ...searchOptions,
          orderDirection: this.getOrderDirection(options.order),
          withExif: options.withExif ?? false,
          withStacked: options.withStacked ?? false,
        },
      );
    };

    return this.executeSafely(
      operation,
      'get assets for dynamic album',
      { items: [], hasNextPage: false },
      operationOptions,
    );
  }

  /**
   * Calculate metadata for a dynamic album
   */
  async calculateMetadata(
    filters: DynamicAlbumFilters,
    ownerId: string,
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<DynamicAlbumMetadata> {
    const operation = async (): Promise<DynamicAlbumMetadata> => {
      const searchResult = await this.getAssetsForDynamicAlbum(
        filters,
        ownerId,
        { size: DYNAMIC_ALBUM_CONFIG.DEFAULT_SEARCH_SIZE },
        operationOptions,
      );

      const assets = searchResult.items || [];

      if (assets.length === 0) {
        return {
          assetCount: 0,
          startDate: null,
          endDate: null,
          lastModifiedAssetTimestamp: null,
        };
      }

      // Calculate date ranges
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

      return {
        assetCount: assets.length,
        startDate: dates.length > 0 ? dates[0] : null,
        endDate: dates.length > 0 ? dates[dates.length - 1] : null,
        lastModifiedAssetTimestamp: updatedDates.length > 0 ? updatedDates[0] : null,
      };
    };

    const defaultMetadata: DynamicAlbumMetadata = {
      assetCount: 0,
      startDate: null,
      endDate: null,
      lastModifiedAssetTimestamp: null,
    };

    return this.executeSafely(operation, 'calculate metadata for dynamic album', defaultMetadata, operationOptions);
  }

  /**
   * Get thumbnail asset ID for a dynamic album
   */
  async getThumbnailAssetId(
    filters: DynamicAlbumFilters,
    ownerId: string,
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<string | null> {
    const operation = async (): Promise<string | null> => {
      const searchResult = await this.getAssetsForDynamicAlbum(
        filters,
        ownerId,
        { size: DYNAMIC_ALBUM_CONFIG.THUMBNAIL_SEARCH_SIZE },
        operationOptions,
      );

      return searchResult.items?.length > 0 ? searchResult.items[0].id : null;
    };

    return this.executeSafely(operation, 'get thumbnail for dynamic album', null, operationOptions);
  }

  /**
   * Validate that a thumbnail asset belongs to a dynamic album
   */
  async validateThumbnail(
    albumId: string,
    thumbnailAssetId: string,
    filters: DynamicAlbumFilters,
    ownerId: string,
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<boolean> {
    const operation = async (): Promise<boolean> => {
      const searchResult = await this.getAssetsForDynamicAlbum(
        filters,
        ownerId,
        { size: DYNAMIC_ALBUM_CONFIG.DEFAULT_SEARCH_SIZE },
        operationOptions,
      );

      const assetIds = searchResult.items?.map((asset: any) => asset.id) || [];
      return assetIds.includes(thumbnailAssetId);
    };

    return this.executeSafely(operation, `validate thumbnail for dynamic album ${albumId}`, false, operationOptions);
  }

  /**
   * Get assets for time bucket (used by timeline service)
   */
  async getAssetsForTimeBucket(
    filters: DynamicAlbumFilters,
    ownerId: string,
    timeBucket: string,
    order: AssetOrder = AssetOrder.DESC,
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<any[]> {
    const operation = async (): Promise<any[]> => {
      const searchResult = await this.getAssetsForDynamicAlbum(
        filters,
        ownerId,
        { size: DYNAMIC_ALBUM_CONFIG.DEFAULT_SEARCH_SIZE, order },
        operationOptions,
      );

      // Filter assets by the specific time bucket
      const [year, month] = timeBucket.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      return (searchResult.items || []).filter((asset: any) => {
        const assetDate = new Date(asset.fileCreatedAt || asset.localDateTime);
        return assetDate >= startDate && assetDate <= endDate;
      });
    };

    return this.executeSafely(operation, 'get assets for time bucket', [], operationOptions);
  }

  /**
   * Get map markers for dynamic album
   */
  async getMapMarkers(
    filters: DynamicAlbumFilters,
    ownerId: string,
    mapOptions: any = {},
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<any[]> {
    const operation = async (): Promise<any[]> => {
      const searchResult = await this.getAssetsForDynamicAlbum(
        filters,
        ownerId,
        {
          size: DYNAMIC_ALBUM_CONFIG.DEFAULT_SEARCH_SIZE,
          withExif: true,
        },
        operationOptions,
      );

      // Filter assets to only include those with GPS coordinates and convert to map markers
      return (searchResult.items || [])
        .filter((asset: any) => asset.exif?.latitude && asset.exif?.longitude)
        .map((asset: any) => ({
          id: asset.id,
          lat: asset.exif.latitude,
          lon: asset.exif.longitude,
          city: asset.exif.city || null,
          state: asset.exif.state || null,
          country: asset.exif.country || null,
        }));
    };

    return this.executeSafely(operation, 'get map markers for dynamic album', [], operationOptions);
  }

  /**
   * Update thumbnail for dynamic album if needed
   */
  async updateThumbnailIfNeeded(
    albumId: string,
    filters: DynamicAlbumFilters,
    currentThumbnailId: string | null,
    ownerId: string,
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<string | null> {
    const operation = async (): Promise<string | null> => {
      // If no current thumbnail, get the first asset
      if (!currentThumbnailId) {
        return await this.getThumbnailAssetId(filters, ownerId, operationOptions);
      }

      // If current thumbnail exists, validate it's still in the album
      const isValid = await this.validateThumbnail(albumId, currentThumbnailId, filters, ownerId, operationOptions);

      if (!isValid) {
        // Current thumbnail is no longer valid, get a new one
        return await this.getThumbnailAssetId(filters, ownerId, operationOptions);
      }

      return currentThumbnailId;
    };

    return this.executeSafely(operation, `update thumbnail for dynamic album ${albumId}`, null, operationOptions);
  }

  /**
   * Convert filters to search options with caching
   */
  private convertFiltersToSearchOptions(filters: DynamicAlbumFilters, userId: string, useCache = true): any {
    const cacheKey = `${JSON.stringify(filters)}-${userId}`;

    if (useCache && this.filterCache.has(cacheKey)) {
      const cached = this.filterCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < DYNAMIC_ALBUM_CONFIG.FILTER_CACHE_TTL_MS) {
        return cached.result;
      } else {
        this.filterCache.delete(cacheKey);
      }
    }

    const result = FilterUtil.convertFiltersToSearchOptions(filters, userId);

    if (useCache) {
      this.filterCache.set(cacheKey, { result, timestamp: Date.now() });

      // Clean up old cache entries periodically
      if (this.filterCache.size > 1000) {
        this.cleanupFilterCache();
      }
    }

    return result;
  }

  /**
   * Get order direction from AssetOrder enum
   */
  private getOrderDirection(order?: AssetOrder): 'asc' | 'desc' {
    return order === AssetOrder.ASC ? 'asc' : 'desc';
  }

  /**
   * Standardized error handling for all dynamic album operations
   */
  private async executeSafely<T>(
    operation: () => Promise<T>,
    context: string,
    defaultValue: T,
    options: DynamicAlbumOperationOptions = {},
  ): Promise<T> {
    try {
      const timeoutPromise = options.timeout
        ? new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${context}`)), options.timeout))
        : null;

      const operationPromise = operation();

      const result = timeoutPromise ? await Promise.race([operationPromise, timeoutPromise]) : await operationPromise;

      return result;
    } catch (error) {
      const errorMessage = `Failed to ${context}`;
      this.logger.error(errorMessage, error);

      if (options.throwOnError) {
        throw new BadRequestException(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      return defaultValue;
    }
  }

  /**
   * Clean up old filter cache entries
   */
  private cleanupFilterCache(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, value] of this.filterCache.entries()) {
      if (now - value.timestamp > DYNAMIC_ALBUM_CONFIG.FILTER_CACHE_TTL_MS) {
        toDelete.push(key);
      }
    }

    toDelete.forEach((key) => this.filterCache.delete(key));
  }
}
