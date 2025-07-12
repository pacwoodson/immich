import { AlbumFilterType } from 'src/enum';

/**
 * Album filter structure for type safety
 */
export interface AlbumFilter {
  type: AlbumFilterType;
  value: any;
}

/**
 * Utility functions for processing album filters
 */
export class FilterUtil {
  /**
   * Filter assets by time bucket (year-month)
   * @param assets Array of assets to filter
   * @param timeBucket Time bucket in format YYYY-MM-DD
   * @returns Filtered assets that fall within the time bucket
   */
  static filterAssetsByTimeBucket<T extends { fileCreatedAt?: Date | string }>(assets: T[], timeBucket: string): T[] {
    // Parse the time bucket (format: YYYY-MM-DD)
    const [year, month] = timeBucket.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1); // First day of the month
    const endDate = new Date(year, month, 0); // Last day of the month

    // Filter assets by the time bucket
    return assets.filter((asset) => {
      if (!asset.fileCreatedAt) return false;
      const assetDate = new Date(asset.fileCreatedAt);
      return assetDate >= startDate && assetDate <= endDate;
    });
  }

  /**
   * Validate album filters
   * @param filters Array of album filters to validate
   * @returns Array of validation errors (empty if valid)
   */
  static validateFilters(filters: AlbumFilter[]): string[] {
    const errors: string[] = [];

    if (!filters || filters.length === 0) {
      return errors;
    }

    for (const filter of filters) {
      if (!filter.type) {
        errors.push('Filter type is required');
        continue;
      }

      if (!filter.value) {
        errors.push(`Filter value is required for type: ${filter.type}`);
        continue;
      }

      // Validate specific filter types
      switch (filter.type) {
        case AlbumFilterType.TAG:
          if (typeof filter.value !== 'string' && !Array.isArray(filter.value)) {
            errors.push('Tag filter value must be a string or array of strings');
          }
          break;
        case AlbumFilterType.PERSON:
          if (typeof filter.value !== 'string' && !Array.isArray(filter.value)) {
            errors.push('Person filter value must be a string or array of strings');
          }
          break;
        case AlbumFilterType.LOCATION:
          if (typeof filter.value !== 'string') {
            errors.push('Location filter value must be a string');
          }
          break;
        case AlbumFilterType.DATE_RANGE:
          if (typeof filter.value !== 'object' || !filter.value.start || !filter.value.end) {
            errors.push('Date range filter value must be an object with start and end dates');
          }
          break;
        case AlbumFilterType.ASSET_TYPE:
          if (!['IMAGE', 'VIDEO'].includes(filter.value as string)) {
            errors.push('Asset type filter value must be either IMAGE or VIDEO');
          }
          break;
        case AlbumFilterType.METADATA:
          if (typeof filter.value !== 'object') {
            errors.push('Metadata filter value must be an object');
          }
          break;
        default:
          errors.push(`Unknown filter type: ${filter.type}`);
      }
    }

    return errors;
  }

  /**
   * Normalize filter values for consistent processing
   * @param filters Array of album filters to normalize
   * @returns Array of normalized filters
   */
  static normalizeFilters(filters: AlbumFilter[]): AlbumFilter[] {
    if (!filters || filters.length === 0) {
      return [];
    }

    return filters.map((filter) => {
      const normalized = { ...filter };

      // Normalize string arrays to ensure consistent format
      if (filter.type === AlbumFilterType.TAG || filter.type === AlbumFilterType.PERSON) {
        if (typeof filter.value === 'string') {
          normalized.value = [filter.value];
        } else if (Array.isArray(filter.value)) {
          normalized.value = filter.value.filter((v: any) => v && typeof v === 'string');
        }
      }

      // Normalize location values
      if (filter.type === AlbumFilterType.LOCATION) {
        if (typeof filter.value === 'string') {
          normalized.value = filter.value.trim();
        }
      }

      // Normalize date ranges
      if (filter.type === AlbumFilterType.DATE_RANGE && typeof filter.value === 'object') {
        const dateRange = filter.value as { start?: string; end?: string };
        if (dateRange.start && dateRange.end) {
          normalized.value = {
            start: new Date(dateRange.start).toISOString(),
            end: new Date(dateRange.end).toISOString(),
          };
        }
      }

      return normalized;
    });
  }

  /**
   * Convert legacy dynamic album filters to new album filter format
   * @param legacyFilters Array of legacy filters with filterType and filterValue
   * @returns Array of new album filters
   */
  static convertLegacyFilters(legacyFilters: Array<{ filterType: string; filterValue: any }>): AlbumFilter[] {
    if (!legacyFilters || legacyFilters.length === 0) {
      return [];
    }

    return legacyFilters.map((filter) => ({
      type: filter.filterType as any,
      value: filter.filterValue,
    }));
  }

  /**
   * Check if filters are equivalent (for deduplication)
   * @param filter1 First filter
   * @param filter2 Second filter
   * @returns True if filters are equivalent
   */
  static areFiltersEquivalent(filter1: AlbumFilter, filter2: AlbumFilter): boolean {
    if (filter1.type !== filter2.type) {
      return false;
    }

    // Deep comparison for complex values
    return JSON.stringify(filter1.value) === JSON.stringify(filter2.value);
  }

  /**
   * Remove duplicate filters from an array
   * @param filters Array of filters to deduplicate
   * @returns Array of unique filters
   */
  static deduplicateFilters(filters: AlbumFilter[]): AlbumFilter[] {
    if (!filters || filters.length === 0) {
      return [];
    }

    const unique: AlbumFilter[] = [];

    for (const filter of filters) {
      if (!unique.some((existing) => FilterUtil.areFiltersEquivalent(existing, filter))) {
        unique.push(filter);
      }
    }

    return unique;
  }
}
