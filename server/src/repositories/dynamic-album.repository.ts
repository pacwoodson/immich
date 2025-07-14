import { Injectable } from '@nestjs/common';
import { DYNAMIC_ALBUM_CONFIG } from 'src/config/dynamic-albums.config';
import { AssetOrder } from 'src/enum';
import { SearchRepository } from 'src/repositories/search.repository';
import {
  DynamicAlbumFilters,
  DynamicAlbumOperationOptions,
  DynamicAlbumSearchOptions,
  validateDynamicAlbumFilters,
} from 'src/types/dynamic-album.types';
import { FilterConversionResult, SearchOptions } from 'src/types/search.types';
import { convertDynamicAlbumFiltersToSearchOptions } from 'src/utils/database';

export interface DynamicAlbumAssetResult {
  items: any[];
  hasNextPage: boolean;
  totalCount?: number;
}

export interface DynamicAlbumMetadataResult {
  assetCount: number;
  startDate: Date | null;
  endDate: Date | null;
  lastModifiedAssetTimestamp: Date | null;
}

@Injectable()
export class DynamicAlbumRepository {
  private filterCache = new Map<string, { result: FilterConversionResult; timestamp: number }>();

  constructor(private searchRepository: SearchRepository) {}

  /**
   * Get assets for a dynamic album with comprehensive options
   */
  async getAssets(
    filters: DynamicAlbumFilters,
    ownerId: string,
    options: DynamicAlbumSearchOptions = {},
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<DynamicAlbumAssetResult> {
    const operation = async (): Promise<DynamicAlbumAssetResult> => {
      const conversionResult = this.convertFiltersToSearchOptions(filters, ownerId, operationOptions.useCache);

      // Handle conversion errors
      if (conversionResult.errors.length > 0) {
        const errorMessage = `Filter conversion failed: ${conversionResult.errors.map((e) => e.message).join(', ')}`;
        console.error(errorMessage, conversionResult.errors);

        if (operationOptions.throwOnError) {
          throw new Error(errorMessage);
        }

        // Return empty result for safety
        return { items: [], hasNextPage: false };
      }

      const searchResult = await this.searchRepository.searchMetadata(
        {
          page: options.page ?? 1,
          size: Math.min(
            options.size ?? DYNAMIC_ALBUM_CONFIG.DEFAULT_SEARCH_SIZE,
            DYNAMIC_ALBUM_CONFIG.MAX_SEARCH_SIZE,
          ),
        },
        {
          ...conversionResult.searchOptions,
          orderDirection: this.getOrderDirection(options.order),
          withExif: options.withExif ?? false,
          withStacked: options.withStacked ?? false,
        },
      );

      return {
        items: searchResult.items || [],
        hasNextPage: searchResult.hasNextPage || false,
      };
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
  async getMetadata(
    filters: DynamicAlbumFilters,
    ownerId: string,
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<DynamicAlbumMetadataResult> {
    const operation = async (): Promise<DynamicAlbumMetadataResult> => {
      // Validate filters before processing
      const validationResult = validateDynamicAlbumFilters(filters);
      if (!validationResult.isValid) {
        const errorMessage = `Invalid filters: ${validationResult.errors.map((e) => e.message).join(', ')}`;
        console.error(errorMessage, validationResult.errors);

        if (operationOptions.throwOnError) {
          throw new Error(errorMessage);
        }

        // Return empty metadata for invalid filters
        return {
          assetCount: 0,
          startDate: null,
          endDate: null,
          lastModifiedAssetTimestamp: null,
        };
      }

      const searchResult = await this.getAssets(
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

    return this.executeSafely(
      operation,
      'calculate metadata for dynamic album',
      {
        assetCount: 0,
        startDate: null,
        endDate: null,
        lastModifiedAssetTimestamp: null,
      },
      operationOptions,
    );
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
      const searchResult = await this.getAssets(
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
   * Check if a specific asset belongs to a dynamic album
   */
  async isAssetInDynamicAlbum(
    assetId: string,
    filters: DynamicAlbumFilters,
    ownerId: string,
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<boolean> {
    const operation = async (): Promise<boolean> => {
      const searchOptions = await this.getSearchOptions(filters, ownerId, operationOptions);

      // Search for the specific asset with the dynamic album filters
      const searchResult = await this.searchRepository.searchMetadata(
        { page: 1, size: 1 },
        {
          ...searchOptions,
          id: assetId, // Use 'id' instead of 'assetIds' to filter by specific asset
        },
      );

      // If we find the asset with the given filters, it belongs to the dynamic album
      return (searchResult.items || []).length > 0;
    };

    return this.executeSafely(operation, 'check if asset belongs to dynamic album', false, operationOptions);
  }

  /**
   * Get search options for a dynamic album
   */
  async getSearchOptions(
    filters: DynamicAlbumFilters,
    ownerId: string,
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<SearchOptions> {
    const operation = async (): Promise<SearchOptions> => {
      const conversionResult = this.convertFiltersToSearchOptions(filters, ownerId, operationOptions.useCache);

      if (conversionResult.errors.length > 0) {
        const errorMessage = `Filter conversion failed: ${conversionResult.errors.map((e) => e.message).join(', ')}`;
        console.error(errorMessage, conversionResult.errors);

        if (operationOptions.throwOnError) {
          throw new Error(errorMessage);
        }

        return {};
      }

      return conversionResult.searchOptions;
    };

    return this.executeSafely(operation, 'get search options for dynamic album', {}, operationOptions);
  }

  /**
   * Get assets for download (streaming)
   */
  async getAssetsForDownload(
    filters: DynamicAlbumFilters,
    ownerId: string,
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<any> {
    const operation = async () => {
      const searchOptions = await this.getSearchOptions(filters, ownerId, operationOptions);
      return this.searchRepository.searchMetadata(
        { page: 1, size: 50000 },
        {
          ...searchOptions,
          withExif: true, // Need exif for file size
        },
      );
    };

    return this.executeSafely(
      operation,
      'get assets for download',
      { items: [], hasNextPage: false },
      operationOptions,
    );
  }

  /**
   * Get assets for map markers
   */
  async getAssetsForMapMarkers(
    filters: DynamicAlbumFilters,
    ownerId: string,
    options: {
      isArchived?: boolean;
      isFavorite?: boolean;
      fileCreatedAfter?: Date;
      fileCreatedBefore?: Date;
    } = {},
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<any[]> {
    const operation = async (): Promise<any[]> => {
      const searchOptions = await this.getSearchOptions(filters, ownerId, operationOptions);

      // Add map-specific filters
      const mapSearchOptions = {
        ...searchOptions,
        withExif: true,
        ...options,
      };

      const searchResult = await this.searchRepository.searchMetadata({ page: 1, size: 50000 }, mapSearchOptions);

      // Filter assets that have location data
      return (searchResult.items || []).filter((asset: any) => {
        return asset.exifInfo?.latitude && asset.exifInfo?.longitude;
      });
    };

    return this.executeSafely(operation, 'get assets for map markers', [], operationOptions);
  }

  /**
   * Get assets for timeline buckets
   */
  async getAssetsForTimelineBuckets(
    filters: DynamicAlbumFilters,
    ownerId: string,
    order: AssetOrder = AssetOrder.DESC,
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<any[]> {
    const operation = async (): Promise<any[]> => {
      const searchResult = await this.getAssets(filters, ownerId, { size: 50000, order }, operationOptions);

      return searchResult.items || [];
    };

    return this.executeSafely(operation, 'get assets for timeline buckets', [], operationOptions);
  }

  /**
   * Get assets for a specific time bucket
   */
  async getAssetsForTimeBucket(
    filters: DynamicAlbumFilters,
    ownerId: string,
    timeBucket: string,
    order: AssetOrder = AssetOrder.DESC,
    operationOptions: DynamicAlbumOperationOptions = {},
  ): Promise<any[]> {
    const operation = async (): Promise<any[]> => {
      const searchOptions = await this.getSearchOptions(filters, ownerId, operationOptions);

      // Add time bucket filtering
      const timeBucketDate = new Date(timeBucket);
      const nextMonth = new Date(timeBucketDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const bucketSearchOptions = {
        ...searchOptions,
        takenAfter: timeBucketDate,
        takenBefore: nextMonth,
        orderDirection: this.getOrderDirection(order),
      };

      const searchResult = await this.searchRepository.searchMetadata({ page: 1, size: 50000 }, bucketSearchOptions);

      return searchResult.items || [];
    };

    return this.executeSafely(operation, 'get assets for time bucket', [], operationOptions);
  }

  private convertFiltersToSearchOptions(
    filters: DynamicAlbumFilters,
    userId: string,
    useCache = true,
  ): FilterConversionResult {
    const cacheKey = `${JSON.stringify(filters)}-${userId}`;
    const now = Date.now();

    // Check cache first
    if (useCache) {
      const cached = this.filterCache.get(cacheKey);
      if (cached && now - cached.timestamp < DYNAMIC_ALBUM_CONFIG.FILTER_CACHE_TTL_MS) {
        return cached.result;
      }
    }

    // Use the centralized utility function
    const searchOptions = convertDynamicAlbumFiltersToSearchOptions(filters, userId);
    const result: FilterConversionResult = {
      searchOptions,
      errors: [],
      warnings: [],
    };

    // Cache the result
    if (useCache) {
      this.filterCache.set(cacheKey, { result, timestamp: now });
      this.cleanupFilterCache();
    }

    return result;
  }

  private getOrderDirection(order?: AssetOrder): 'asc' | 'desc' {
    return order === 'asc' ? 'asc' : 'desc';
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
      console.error(`Error in ${operationName}:`, error);

      if (options.throwOnError) {
        throw error;
      }

      return defaultValue;
    }
  }

  private cleanupFilterCache() {
    const now = Date.now();
    const maxAge = DYNAMIC_ALBUM_CONFIG.FILTER_CACHE_TTL_MS;

    for (const [key, value] of this.filterCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.filterCache.delete(key);
      }
    }
  }
}
