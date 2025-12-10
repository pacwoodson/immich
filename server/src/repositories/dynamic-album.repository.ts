import { Injectable, Logger } from '@nestjs/common';
import { Kysely, Selectable } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DYNAMIC_ALBUM_CONFIG } from 'src/config/dynamic-albums.config';
import { AssetOrder, AssetType } from 'src/enum';
import { AssetSearchBuilderOptions, SearchRepository } from 'src/repositories/search.repository';
import { DB } from 'src/schema';
import { AssetTable } from 'src/schema/tables/asset.table';
import { DynamicAlbumFilters, sanitizeDynamicAlbumFilters, validateDynamicAlbumFilters } from 'src/types/dynamic-album.types';

export type Asset = Selectable<AssetTable>;

export interface DynamicAlbumAssetOptions {
  page?: number;
  size?: number;
  order?: AssetOrder;
  withExif?: boolean;
}

export interface DynamicAlbumAssetResult {
  items: Asset[];
  hasNextPage: boolean;
}

export interface DynamicAlbumMetadata {
  assetCount: number;
  startDate: Date | null;
  endDate: Date | null;
  lastModifiedAssetTimestamp: Date | null;
}

/**
 * Repository for querying assets based on dynamic album filters
 * Centralizes the logic for converting dynamic album filters to search queries
 */
@Injectable()
export class DynamicAlbumRepository {
  private logger = new Logger(DynamicAlbumRepository.name);

  constructor(
    @InjectKysely() private db: Kysely<DB>,
    private searchRepository: SearchRepository,
  ) {}

  /**
   * Get assets matching dynamic album filters
   *
   * @param filters - Dynamic album filter criteria
   * @param ownerId - Owner user ID for access control
   * @param options - Pagination and query options
   * @returns Paginated asset results
   */
  async getAssets(
    filters: DynamicAlbumFilters,
    ownerId: string,
    options: DynamicAlbumAssetOptions = {},
  ): Promise<DynamicAlbumAssetResult> {
    const { page = 1, size = DYNAMIC_ALBUM_CONFIG.DEFAULT_SEARCH_SIZE, order = AssetOrder.Desc } = options;

    try {
      // Validate and sanitize filters
      const sanitizedFilters = sanitizeDynamicAlbumFilters(filters);
      const validation = validateDynamicAlbumFilters(sanitizedFilters);

      if (!validation.isValid) {
        this.logger.warn(`Invalid dynamic album filters: ${validation.errors.map((e) => e.message).join(', ')}`);
        return { items: [], hasNextPage: false };
      }

      // Convert to search options
      const searchOptions = this.convertFiltersToSearchOptions(sanitizedFilters, ownerId);

      // Execute search
      const result = await this.searchRepository.searchMetadata(
        { page, size: Math.min(size, DYNAMIC_ALBUM_CONFIG.MAX_SEARCH_SIZE) },
        searchOptions,
      );

      return {
        items: result.items,
        hasNextPage: result.hasNextPage,
      };
    } catch (error) {
      this.logger.error(`Error fetching assets for dynamic album: ${error}`);
      return { items: [], hasNextPage: false };
    }
  }

  /**
   * Calculate metadata for a dynamic album
   * Returns asset count and date range
   *
   * @param filters - Dynamic album filter criteria
   * @param ownerId - Owner user ID for access control
   * @returns Album metadata
   */
  async getMetadata(filters: DynamicAlbumFilters, ownerId: string): Promise<DynamicAlbumMetadata> {
    try {
      // Validate and sanitize filters
      const sanitizedFilters = sanitizeDynamicAlbumFilters(filters);
      const validation = validateDynamicAlbumFilters(sanitizedFilters);

      if (!validation.isValid) {
        this.logger.warn(`Invalid dynamic album filters: ${validation.errors.map((e) => e.message).join(', ')}`);
        return {
          assetCount: 0,
          startDate: null,
          endDate: null,
          lastModifiedAssetTimestamp: null,
        };
      }

      // Convert to search options
      const searchOptions = this.convertFiltersToSearchOptions(sanitizedFilters, ownerId);

      // Get count
      const stats = await this.searchRepository.searchStatistics(searchOptions);

      // Get date range and last modified
      const dateInfo = await this.getDateRangeInfo(searchOptions);

      return {
        assetCount: Number(stats.total),
        startDate: dateInfo.startDate,
        endDate: dateInfo.endDate,
        lastModifiedAssetTimestamp: dateInfo.lastModified,
      };
    } catch (error) {
      this.logger.error(`Error calculating metadata for dynamic album: ${error}`);
      return {
        assetCount: 0,
        startDate: null,
        endDate: null,
        lastModifiedAssetTimestamp: null,
      };
    }
  }

  /**
   * Get the first asset ID to use as album thumbnail
   *
   * @param filters - Dynamic album filter criteria
   * @param ownerId - Owner user ID for access control
   * @returns Asset ID or null if no assets match
   */
  async getThumbnailAssetId(filters: DynamicAlbumFilters, ownerId: string): Promise<string | null> {
    try {
      // Validate and sanitize filters
      const sanitizedFilters = sanitizeDynamicAlbumFilters(filters);
      const validation = validateDynamicAlbumFilters(sanitizedFilters);

      if (!validation.isValid) {
        return null;
      }

      // Convert to search options
      const searchOptions = this.convertFiltersToSearchOptions(sanitizedFilters, ownerId);

      // Get first asset
      const result = await this.searchRepository.searchMetadata(
        { page: 1, size: DYNAMIC_ALBUM_CONFIG.THUMBNAIL_SEARCH_SIZE },
        searchOptions,
      );

      return result.items.length > 0 ? result.items[0].id : null;
    } catch (error) {
      this.logger.error(`Error getting thumbnail for dynamic album: ${error}`);
      return null;
    }
  }

  /**
   * Check if a specific asset belongs to a dynamic album
   *
   * @param assetId - Asset ID to check
   * @param filters - Dynamic album filter criteria
   * @param ownerId - Owner user ID for access control
   * @returns True if asset matches filters
   */
  async isAssetInDynamicAlbum(assetId: string, filters: DynamicAlbumFilters, ownerId: string): Promise<boolean> {
    try {
      // Validate and sanitize filters
      const sanitizedFilters = sanitizeDynamicAlbumFilters(filters);
      const validation = validateDynamicAlbumFilters(sanitizedFilters);

      if (!validation.isValid) {
        return false;
      }

      // Convert to search options and add asset ID filter
      const searchOptions = this.convertFiltersToSearchOptions(sanitizedFilters, ownerId);
      searchOptions.id = assetId;

      // Search for the asset
      const stats = await this.searchRepository.searchStatistics(searchOptions);

      return Number(stats.total) > 0;
    } catch (error) {
      this.logger.error(`Error checking if asset is in dynamic album: ${error}`);
      return false;
    }
  }

  /**
   * Convert dynamic album filters to search repository options
   * This is the core conversion logic that maps our filter structure to the search API
   *
   * @param filters - Sanitized dynamic album filters
   * @param userId - User ID for access control
   * @returns Search options for SearchRepository
   */
  private convertFiltersToSearchOptions(
    filters: DynamicAlbumFilters,
    userId: string,
  ): AssetSearchBuilderOptions {
    const searchOptions: AssetSearchBuilderOptions = {
      userIds: [userId],
    };

    // Convert tags
    if (filters.tags && filters.tags.length > 0) {
      searchOptions.tagIds = filters.tags;
      searchOptions.tagOperator = filters.operator || 'or';
    }

    // Convert people
    if (filters.people && filters.people.length > 0) {
      searchOptions.personIds = filters.people;
    }

    // Convert location
    if (filters.location) {
      if (typeof filters.location === 'string') {
        // Free-text location search
        // Note: SearchRepository might not support free-text location yet
        // For now, we'll skip this and handle structured location only
        this.logger.warn('Free-text location search not yet supported in dynamic albums');
      } else {
        // Structured location
        if (filters.location.city) {
          searchOptions.city = filters.location.city;
        }
        if (filters.location.state) {
          searchOptions.state = filters.location.state;
        }
        if (filters.location.country) {
          searchOptions.country = filters.location.country;
        }
      }
    }

    // Convert date range
    if (filters.dateRange) {
      searchOptions.takenAfter = new Date(filters.dateRange.start);
      searchOptions.takenBefore = new Date(filters.dateRange.end);
    }

    // Convert asset type
    if (filters.assetType) {
      searchOptions.type = filters.assetType === 'IMAGE' ? AssetType.Image : AssetType.Video;
    }

    // Convert metadata
    if (filters.metadata) {
      if (filters.metadata.isFavorite !== undefined) {
        searchOptions.isFavorite = filters.metadata.isFavorite;
      }
      if (filters.metadata.make) {
        searchOptions.make = filters.metadata.make;
      }
      if (filters.metadata.model) {
        searchOptions.model = filters.metadata.model;
      }
      if (filters.metadata.lensModel) {
        searchOptions.lensModel = filters.metadata.lensModel;
      }
      if (filters.metadata.rating !== undefined) {
        searchOptions.rating = filters.metadata.rating;
      }
    }

    return searchOptions;
  }

  /**
   * Get date range and last modified timestamp for assets matching filters
   */
  private async getDateRangeInfo(searchOptions: AssetSearchBuilderOptions): Promise<{
    startDate: Date | null;
    endDate: Date | null;
    lastModified: Date | null;
  }> {
    try {
      // This would ideally be a single optimized query
      // For now, we'll fetch a sample of assets
      const result = await this.searchRepository.searchMetadata({ page: 1, size: 100 }, searchOptions);

      if (result.items.length === 0) {
        return { startDate: null, endDate: null, lastModified: null };
      }

      // Calculate from sample (not ideal, but works for now)
      const dates = result.items.map((asset) => new Date(asset.fileCreatedAt)).sort((a, b) => a.getTime() - b.getTime());
      const modifiedDates = result.items.map((asset) => new Date(asset.updatedAt)).sort((a, b) => b.getTime() - a.getTime());

      return {
        startDate: dates[0],
        endDate: dates[dates.length - 1],
        lastModified: modifiedDates[0],
      };
    } catch (error) {
      this.logger.error(`Error getting date range info: ${error}`);
      return { startDate: null, endDate: null, lastModified: null };
    }
  }
}
