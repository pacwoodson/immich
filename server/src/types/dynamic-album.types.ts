import { AssetOrder } from 'src/enum';

export interface LocationFilter {
  city?: string;
  state?: string;
  country?: string;
}

export interface DateRangeFilter {
  start: Date | string;
  end: Date | string;
}

export interface MetadataFilter {
  isFavorite?: boolean;
  make?: string;
  model?: string;
  lensModel?: string;
  rating?: number;
}

export interface DynamicAlbumFilters {
  tags?: string[];
  people?: string[];
  location?: string | LocationFilter;
  dateRange?: DateRangeFilter;
  assetType?: 'IMAGE' | 'VIDEO';
  metadata?: MetadataFilter;
  operator?: 'and' | 'or';
}

export interface DynamicAlbumSearchOptions {
  page?: number;
  size?: number;
  order?: AssetOrder;
  withExif?: boolean;
  withStacked?: boolean;
}

export interface DynamicAlbumMetadata {
  assetCount: number;
  startDate: Date | null;
  endDate: Date | null;
  lastModifiedAssetTimestamp: Date | null;
}

export interface DynamicAlbumAssetResult {
  items: any[]; // TODO: Replace with proper Asset type
  hasNextPage: boolean;
}

export interface DynamicAlbumSearchResult {
  assets: DynamicAlbumAssetResult;
  metadata: DynamicAlbumMetadata;
}

export interface DynamicAlbumOperationOptions {
  throwOnError?: boolean;
  useCache?: boolean;
  timeout?: number;
}

/**
 * Validation error interface
 */
export interface DynamicAlbumFilterValidationError {
  field: string;
  message: string;
  value: unknown;
}

/**
 * Validation result interface
 */
export interface DynamicAlbumFilterValidationResult {
  isValid: boolean;
  errors: DynamicAlbumFilterValidationError[];
  warnings: string[];
}

/**
 * Type guard for LocationFilter
 */
export function isLocationFilter(obj: unknown): obj is LocationFilter {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const location = obj as Record<string, unknown>;

  // Check that all properties, if present, are strings
  if (location.city !== undefined && typeof location.city !== 'string') return false;
  if (location.state !== undefined && typeof location.state !== 'string') return false;
  if (location.country !== undefined && typeof location.country !== 'string') return false;

  // At least one property should be defined
  return location.city !== undefined || location.state !== undefined || location.country !== undefined;
}

/**
 * Type guard for DateRangeFilter
 */
export function isDateRangeFilter(obj: unknown): obj is DateRangeFilter {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const dateRange = obj as Record<string, unknown>;

  if (!dateRange.start || !dateRange.end) {
    return false;
  }

  // Check if start and end are valid dates (string or Date)
  const startIsValid = typeof dateRange.start === 'string' || dateRange.start instanceof Date;
  const endIsValid = typeof dateRange.end === 'string' || dateRange.end instanceof Date;

  if (!startIsValid || !endIsValid) {
    return false;
  }

  // Try to parse dates if they're strings
  try {
    const start = new Date(dateRange.start as string | Date);
    const end = new Date(dateRange.end as string | Date);

    // Check if dates are valid
    return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;
  } catch {
    return false;
  }
}

/**
 * Type guard for MetadataFilter
 */
export function isMetadataFilter(obj: unknown): obj is MetadataFilter {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const metadata = obj as Record<string, unknown>;

  // Check each optional property's type
  if (metadata.isFavorite !== undefined && typeof metadata.isFavorite !== 'boolean') return false;
  if (metadata.make !== undefined && typeof metadata.make !== 'string') return false;
  if (metadata.model !== undefined && typeof metadata.model !== 'string') return false;
  if (metadata.lensModel !== undefined && typeof metadata.lensModel !== 'string') return false;
  if (
    metadata.rating !== undefined &&
    (typeof metadata.rating !== 'number' || metadata.rating < 0 || metadata.rating > 5)
  )
    return false;

  return true;
}

/**
 * Type guard for DynamicAlbumFilters
 */
export function isDynamicAlbumFilters(obj: unknown): obj is DynamicAlbumFilters {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const filters = obj as Record<string, unknown>;

  // Check optional arrays
  if (
    filters.tags !== undefined &&
    (!Array.isArray(filters.tags) || !filters.tags.every((tag) => typeof tag === 'string'))
  ) {
    return false;
  }
  if (
    filters.people !== undefined &&
    (!Array.isArray(filters.people) || !filters.people.every((person) => typeof person === 'string'))
  ) {
    return false;
  }

  // Check location (can be string or LocationFilter)
  if (filters.location !== undefined) {
    if (typeof filters.location !== 'string' && !isLocationFilter(filters.location)) {
      return false;
    }
  }

  // Check dateRange
  if (filters.dateRange !== undefined && !isDateRangeFilter(filters.dateRange)) {
    return false;
  }

  // Check assetType
  if (filters.assetType !== undefined && !['IMAGE', 'VIDEO'].includes(filters.assetType as string)) {
    return false;
  }

  // Check metadata
  if (filters.metadata !== undefined && !isMetadataFilter(filters.metadata)) {
    return false;
  }

  // Check operator
  if (filters.operator !== undefined && !['and', 'or'].includes(filters.operator as string)) {
    return false;
  }

  return true;
}

/**
 * Validate DynamicAlbumFilters with detailed error reporting
 */
export function validateDynamicAlbumFilters(filters: unknown): DynamicAlbumFilterValidationResult {
  const errors: DynamicAlbumFilterValidationError[] = [];
  const warnings: string[] = [];

  if (!filters || typeof filters !== 'object') {
    errors.push({
      field: 'root',
      message: 'Filters must be an object',
      value: filters,
    });
    return { isValid: false, errors, warnings };
  }

  const filtersObj = filters as Record<string, unknown>;

  // Validate tags
  if (filtersObj.tags !== undefined) {
    if (!Array.isArray(filtersObj.tags)) {
      errors.push({
        field: 'tags',
        message: 'Tags must be an array of strings',
        value: filtersObj.tags,
      });
    } else if (!filtersObj.tags.every((tag) => typeof tag === 'string' && tag.trim().length > 0)) {
      errors.push({
        field: 'tags',
        message: 'All tags must be non-empty strings',
        value: filtersObj.tags,
      });
    } else if (filtersObj.tags.length === 0) {
      warnings.push('Tags array is empty and will have no effect');
    }
  }

  // Validate people
  if (filtersObj.people !== undefined) {
    if (!Array.isArray(filtersObj.people)) {
      errors.push({
        field: 'people',
        message: 'People must be an array of strings',
        value: filtersObj.people,
      });
    } else if (!filtersObj.people.every((person) => typeof person === 'string' && person.trim().length > 0)) {
      errors.push({
        field: 'people',
        message: 'All people must be non-empty strings',
        value: filtersObj.people,
      });
    } else if (filtersObj.people.length === 0) {
      warnings.push('People array is empty and will have no effect');
    }
  }

  // Validate location
  if (filtersObj.location !== undefined) {
    if (typeof filtersObj.location === 'string') {
      if (filtersObj.location.trim().length === 0) {
        errors.push({
          field: 'location',
          message: 'Location string cannot be empty',
          value: filtersObj.location,
        });
      }
    } else if (!isLocationFilter(filtersObj.location)) {
      errors.push({
        field: 'location',
        message: 'Location must be a string or a valid LocationFilter object',
        value: filtersObj.location,
      });
    }
  }

  // Validate dateRange
  if (filtersObj.dateRange !== undefined) {
    if (!isDateRangeFilter(filtersObj.dateRange)) {
      errors.push({
        field: 'dateRange',
        message: 'DateRange must have valid start and end dates with start <= end',
        value: filtersObj.dateRange,
      });
    }
  }

  // Validate assetType
  if (filtersObj.assetType !== undefined) {
    if (!['IMAGE', 'VIDEO'].includes(filtersObj.assetType as string)) {
      errors.push({
        field: 'assetType',
        message: 'AssetType must be either "IMAGE" or "VIDEO"',
        value: filtersObj.assetType,
      });
    }
  }

  // Validate metadata
  if (filtersObj.metadata !== undefined) {
    if (!isMetadataFilter(filtersObj.metadata)) {
      errors.push({
        field: 'metadata',
        message: 'Metadata must be a valid MetadataFilter object',
        value: filtersObj.metadata,
      });
    }
  }

  // Validate operator
  if (filtersObj.operator !== undefined) {
    if (!['and', 'or'].includes(filtersObj.operator as string)) {
      errors.push({
        field: 'operator',
        message: 'Operator must be either "and" or "or"',
        value: filtersObj.operator,
      });
    }
  }

  // Check if at least one filter is specified
  const hasAnyFilter =
    filtersObj.tags ||
    filtersObj.people ||
    filtersObj.location ||
    filtersObj.dateRange ||
    filtersObj.assetType ||
    filtersObj.metadata;

  if (!hasAnyFilter) {
    warnings.push('No filters specified - album will include all assets');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitize and normalize DynamicAlbumFilters
 */
export function sanitizeDynamicAlbumFilters(filters: unknown): DynamicAlbumFilters {
  if (!isDynamicAlbumFilters(filters)) {
    return {};
  }

  const sanitized: DynamicAlbumFilters = {};

  // Sanitize tags - remove empty strings and duplicates
  if (filters.tags && Array.isArray(filters.tags)) {
    const uniqueTags = [...new Set(filters.tags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0))];
    if (uniqueTags.length > 0) {
      sanitized.tags = uniqueTags.map((tag) => tag.trim());
    }
  }

  // Sanitize people - remove empty strings and duplicates
  if (filters.people && Array.isArray(filters.people)) {
    const uniquePeople = [
      ...new Set(filters.people.filter((person) => typeof person === 'string' && person.trim().length > 0)),
    ];
    if (uniquePeople.length > 0) {
      sanitized.people = uniquePeople.map((person) => person.trim());
    }
  }

  // Sanitize location
  if (filters.location) {
    if (typeof filters.location === 'string' && filters.location.trim().length > 0) {
      sanitized.location = filters.location.trim();
    } else if (isLocationFilter(filters.location)) {
      const location: LocationFilter = {};
      if (filters.location.city && filters.location.city.trim().length > 0) {
        location.city = filters.location.city.trim();
      }
      if (filters.location.state && filters.location.state.trim().length > 0) {
        location.state = filters.location.state.trim();
      }
      if (filters.location.country && filters.location.country.trim().length > 0) {
        location.country = filters.location.country.trim();
      }
      if (Object.keys(location).length > 0) {
        sanitized.location = location;
      }
    }
  }

  // Sanitize dateRange
  if (filters.dateRange && isDateRangeFilter(filters.dateRange)) {
    sanitized.dateRange = {
      start: new Date(filters.dateRange.start),
      end: new Date(filters.dateRange.end),
    };
  }

  // Sanitize assetType
  if (filters.assetType && ['IMAGE', 'VIDEO'].includes(filters.assetType)) {
    sanitized.assetType = filters.assetType;
  }

  // Sanitize metadata
  if (filters.metadata && isMetadataFilter(filters.metadata)) {
    sanitized.metadata = { ...filters.metadata };
  }

  // Sanitize operator
  if (filters.operator && ['and', 'or'].includes(filters.operator)) {
    sanitized.operator = filters.operator;
  }

  return sanitized;
}
