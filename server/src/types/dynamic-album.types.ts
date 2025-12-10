/**
 * Type definitions, validation, and sanitization for Dynamic Albums feature
 */

/**
 * Location filter for dynamic albums
 * Supports structured location filtering by city, state, or country
 */
export interface LocationFilter {
  city?: string;
  state?: string;
  country?: string;
}

/**
 * Date range filter for dynamic albums
 * Both start and end dates are inclusive
 */
export interface DateRangeFilter {
  start: Date | string;
  end: Date | string;
}

/**
 * Metadata filter for dynamic albums
 * Supports filtering by camera equipment and asset properties
 */
export interface MetadataFilter {
  isFavorite?: boolean;
  make?: string; // Camera make (e.g., "Sony", "Canon")
  model?: string; // Camera model (e.g., "A7III")
  lensModel?: string; // Lens model
  rating?: number; // 0-5 stars
}

/**
 * Complete filter specification for a dynamic album
 * Filters are combined using the specified operator (AND or OR)
 */
export interface DynamicAlbumFilters {
  tags?: string[]; // Array of tag IDs
  people?: string[]; // Array of person IDs
  location?: string | LocationFilter; // Free-text or structured location
  dateRange?: DateRangeFilter; // Date range for asset capture time
  assetType?: 'IMAGE' | 'VIDEO'; // Filter by media type
  metadata?: MetadataFilter; // Additional metadata filters
  operator?: 'and' | 'or'; // How to combine filters (default: 'or')
}

/**
 * Validation error details
 */
export interface DynamicAlbumFilterValidationError {
  field: string;
  message: string;
  value: unknown;
}

/**
 * Validation result
 */
export interface DynamicAlbumFilterValidationResult {
  isValid: boolean;
  errors: DynamicAlbumFilterValidationError[];
  warnings: string[];
}

// ===============================
// Type Guards
// ===============================

/**
 * Type guard for LocationFilter
 */
export function isLocationFilter(obj: unknown): obj is LocationFilter {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const loc = obj as Record<string, unknown>;

  // At least one field must be present
  if (!loc.city && !loc.state && !loc.country) {
    return false;
  }

  // All present fields must be strings
  if (loc.city !== undefined && typeof loc.city !== 'string') {
    return false;
  }
  if (loc.state !== undefined && typeof loc.state !== 'string') {
    return false;
  }
  if (loc.country !== undefined && typeof loc.country !== 'string') {
    return false;
  }

  return true;
}

/**
 * Type guard for DateRangeFilter
 */
export function isDateRangeFilter(obj: unknown): obj is DateRangeFilter {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const range = obj as Record<string, unknown>;

  if (!range.start || !range.end) {
    return false;
  }

  // Check if values are valid dates or date strings
  const isValidDate = (value: unknown): boolean => {
    if (value instanceof Date) {
      return !isNaN(value.getTime());
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      return !isNaN(date.getTime());
    }
    return false;
  };

  return isValidDate(range.start) && isValidDate(range.end);
}

/**
 * Type guard for MetadataFilter
 */
export function isMetadataFilter(obj: unknown): obj is MetadataFilter {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const meta = obj as Record<string, unknown>;

  // All fields are optional, but if present must match type
  if (meta.isFavorite !== undefined && typeof meta.isFavorite !== 'boolean') {
    return false;
  }
  if (meta.make !== undefined && typeof meta.make !== 'string') {
    return false;
  }
  if (meta.model !== undefined && typeof meta.model !== 'string') {
    return false;
  }
  if (meta.lensModel !== undefined && typeof meta.lensModel !== 'string') {
    return false;
  }
  if (meta.rating !== undefined) {
    if (typeof meta.rating !== 'number' || meta.rating < 0 || meta.rating > 5) {
      return false;
    }
  }

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

  // Validate tags
  if (filters.tags !== undefined) {
    if (!Array.isArray(filters.tags)) {
      return false;
    }
    if (!filters.tags.every((tag) => typeof tag === 'string')) {
      return false;
    }
  }

  // Validate people
  if (filters.people !== undefined) {
    if (!Array.isArray(filters.people)) {
      return false;
    }
    if (!filters.people.every((person) => typeof person === 'string')) {
      return false;
    }
  }

  // Validate location
  if (filters.location !== undefined) {
    if (typeof filters.location === 'string') {
      // Free-text location is valid
    } else if (!isLocationFilter(filters.location)) {
      return false;
    }
  }

  // Validate dateRange
  if (filters.dateRange !== undefined && !isDateRangeFilter(filters.dateRange)) {
    return false;
  }

  // Validate assetType
  if (filters.assetType !== undefined) {
    if (filters.assetType !== 'IMAGE' && filters.assetType !== 'VIDEO') {
      return false;
    }
  }

  // Validate metadata
  if (filters.metadata !== undefined && !isMetadataFilter(filters.metadata)) {
    return false;
  }

  // Validate operator
  if (filters.operator !== undefined) {
    if (filters.operator !== 'and' && filters.operator !== 'or') {
      return false;
    }
  }

  return true;
}

// ===============================
// Validation
// ===============================

/**
 * Comprehensive validation of dynamic album filters
 * Returns detailed error information for invalid filters
 */
export function validateDynamicAlbumFilters(filters: unknown): DynamicAlbumFilterValidationResult {
  const errors: DynamicAlbumFilterValidationError[] = [];
  const warnings: string[] = [];

  // Basic type check
  if (!filters || typeof filters !== 'object') {
    return {
      isValid: false,
      errors: [
        {
          field: 'filters',
          message: 'Filters must be an object',
          value: filters,
        },
      ],
      warnings: [],
    };
  }

  const f = filters as Record<string, unknown>;

  // Validate tags
  if (f.tags !== undefined) {
    if (!Array.isArray(f.tags)) {
      errors.push({
        field: 'tags',
        message: 'Tags must be an array of strings',
        value: f.tags,
      });
    } else {
      if (f.tags.length === 0) {
        warnings.push('Tags array is empty');
      }
      if (!f.tags.every((tag) => typeof tag === 'string')) {
        errors.push({
          field: 'tags',
          message: 'All tags must be strings',
          value: f.tags,
        });
      }
      // Check for duplicates
      const uniqueTags = new Set(f.tags);
      if (uniqueTags.size !== f.tags.length) {
        warnings.push('Tags array contains duplicates');
      }
    }
  }

  // Validate people
  if (f.people !== undefined) {
    if (!Array.isArray(f.people)) {
      errors.push({
        field: 'people',
        message: 'People must be an array of strings',
        value: f.people,
      });
    } else {
      if (f.people.length === 0) {
        warnings.push('People array is empty');
      }
      if (!f.people.every((person) => typeof person === 'string')) {
        errors.push({
          field: 'people',
          message: 'All people IDs must be strings',
          value: f.people,
        });
      }
      // Check for duplicates
      const uniquePeople = new Set(f.people);
      if (uniquePeople.size !== f.people.length) {
        warnings.push('People array contains duplicates');
      }
    }
  }

  // Validate location
  if (f.location !== undefined) {
    if (typeof f.location === 'string') {
      if (f.location.trim().length === 0) {
        errors.push({
          field: 'location',
          message: 'Location string cannot be empty',
          value: f.location,
        });
      }
    } else if (!isLocationFilter(f.location)) {
      errors.push({
        field: 'location',
        message: 'Location must be a non-empty string or valid LocationFilter object',
        value: f.location,
      });
    }
  }

  // Validate dateRange
  if (f.dateRange !== undefined) {
    if (!f.dateRange || typeof f.dateRange !== 'object') {
      errors.push({
        field: 'dateRange',
        message: 'Date range must be an object with start and end dates',
        value: f.dateRange,
      });
    } else {
      const range = f.dateRange as Record<string, unknown>;

      if (!range.start) {
        errors.push({
          field: 'dateRange.start',
          message: 'Start date is required',
          value: range.start,
        });
      }
      if (!range.end) {
        errors.push({
          field: 'dateRange.end',
          message: 'End date is required',
          value: range.end,
        });
      }

      if (range.start && range.end) {
        const startDate = new Date(range.start as string | Date);
        const endDate = new Date(range.end as string | Date);

        if (isNaN(startDate.getTime())) {
          errors.push({
            field: 'dateRange.start',
            message: 'Start date is invalid',
            value: range.start,
          });
        }
        if (isNaN(endDate.getTime())) {
          errors.push({
            field: 'dateRange.end',
            message: 'End date is invalid',
            value: range.end,
          });
        }

        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          if (startDate > endDate) {
            errors.push({
              field: 'dateRange',
              message: 'Start date must be before or equal to end date',
              value: f.dateRange,
            });
          }
        }
      }
    }
  }

  // Validate assetType
  if (f.assetType !== undefined) {
    if (f.assetType !== 'IMAGE' && f.assetType !== 'VIDEO') {
      errors.push({
        field: 'assetType',
        message: 'Asset type must be either "IMAGE" or "VIDEO"',
        value: f.assetType,
      });
    }
  }

  // Validate metadata
  if (f.metadata !== undefined) {
    if (!f.metadata || typeof f.metadata !== 'object') {
      errors.push({
        field: 'metadata',
        message: 'Metadata must be an object',
        value: f.metadata,
      });
    } else {
      const meta = f.metadata as Record<string, unknown>;

      if (meta.isFavorite !== undefined && typeof meta.isFavorite !== 'boolean') {
        errors.push({
          field: 'metadata.isFavorite',
          message: 'isFavorite must be a boolean',
          value: meta.isFavorite,
        });
      }
      if (meta.make !== undefined && typeof meta.make !== 'string') {
        errors.push({
          field: 'metadata.make',
          message: 'make must be a string',
          value: meta.make,
        });
      }
      if (meta.model !== undefined && typeof meta.model !== 'string') {
        errors.push({
          field: 'metadata.model',
          message: 'model must be a string',
          value: meta.model,
        });
      }
      if (meta.lensModel !== undefined && typeof meta.lensModel !== 'string') {
        errors.push({
          field: 'metadata.lensModel',
          message: 'lensModel must be a string',
          value: meta.lensModel,
        });
      }
      if (meta.rating !== undefined) {
        if (typeof meta.rating !== 'number') {
          errors.push({
            field: 'metadata.rating',
            message: 'rating must be a number',
            value: meta.rating,
          });
        } else if (meta.rating < 0 || meta.rating > 5) {
          errors.push({
            field: 'metadata.rating',
            message: 'rating must be between 0 and 5',
            value: meta.rating,
          });
        }
      }
    }
  }

  // Validate operator
  if (f.operator !== undefined) {
    if (f.operator !== 'and' && f.operator !== 'or') {
      errors.push({
        field: 'operator',
        message: 'operator must be either "and" or "or"',
        value: f.operator,
      });
    }
  }

  // Check if at least one filter is specified
  const hasAnyFilter =
    f.tags !== undefined ||
    f.people !== undefined ||
    f.location !== undefined ||
    f.dateRange !== undefined ||
    f.assetType !== undefined ||
    f.metadata !== undefined;

  if (!hasAnyFilter) {
    warnings.push('No filters specified - dynamic album will include all assets');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ===============================
// Sanitization
// ===============================

/**
 * Sanitize and normalize dynamic album filters
 * Removes empty/invalid values and normalizes data types
 */
export function sanitizeDynamicAlbumFilters(filters: unknown): DynamicAlbumFilters {
  if (!filters || typeof filters !== 'object') {
    return { operator: 'or' };
  }

  const f = filters as Record<string, unknown>;
  const sanitized: DynamicAlbumFilters = {};

  // Sanitize tags
  if (Array.isArray(f.tags)) {
    const tags = f.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0);
    // Remove duplicates
    const uniqueTags = [...new Set(tags)];
    if (uniqueTags.length > 0) {
      sanitized.tags = uniqueTags;
    }
  }

  // Sanitize people
  if (Array.isArray(f.people)) {
    const people = f.people.filter(
      (person): person is string => typeof person === 'string' && person.trim().length > 0,
    );
    // Remove duplicates
    const uniquePeople = [...new Set(people)];
    if (uniquePeople.length > 0) {
      sanitized.people = uniquePeople;
    }
  }

  // Sanitize location
  if (f.location !== undefined) {
    if (typeof f.location === 'string' && f.location.trim().length > 0) {
      sanitized.location = f.location.trim();
    } else if (isLocationFilter(f.location)) {
      const loc: LocationFilter = {};
      if (f.location.city && f.location.city.trim().length > 0) {
        loc.city = f.location.city.trim();
      }
      if (f.location.state && f.location.state.trim().length > 0) {
        loc.state = f.location.state.trim();
      }
      if (f.location.country && f.location.country.trim().length > 0) {
        loc.country = f.location.country.trim();
      }
      if (loc.city || loc.state || loc.country) {
        sanitized.location = loc;
      }
    }
  }

  // Sanitize dateRange
  if (f.dateRange && typeof f.dateRange === 'object') {
    const range = f.dateRange as Record<string, unknown>;
    if (range.start && range.end) {
      const startDate = new Date(range.start as string | Date);
      const endDate = new Date(range.end as string | Date);

      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        sanitized.dateRange = {
          start: startDate,
          end: endDate,
        };
      }
    }
  }

  // Sanitize assetType
  if (f.assetType === 'IMAGE' || f.assetType === 'VIDEO') {
    sanitized.assetType = f.assetType;
  }

  // Sanitize metadata
  if (f.metadata && typeof f.metadata === 'object') {
    const meta = f.metadata as Record<string, unknown>;
    const sanitizedMeta: MetadataFilter = {};

    if (typeof meta.isFavorite === 'boolean') {
      sanitizedMeta.isFavorite = meta.isFavorite;
    }
    if (typeof meta.make === 'string' && meta.make.trim().length > 0) {
      sanitizedMeta.make = meta.make.trim();
    }
    if (typeof meta.model === 'string' && meta.model.trim().length > 0) {
      sanitizedMeta.model = meta.model.trim();
    }
    if (typeof meta.lensModel === 'string' && meta.lensModel.trim().length > 0) {
      sanitizedMeta.lensModel = meta.lensModel.trim();
    }
    if (typeof meta.rating === 'number' && meta.rating >= 0 && meta.rating <= 5) {
      sanitizedMeta.rating = meta.rating;
    }

    if (Object.keys(sanitizedMeta).length > 0) {
      sanitized.metadata = sanitizedMeta;
    }
  }

  // Sanitize operator
  if (f.operator === 'and' || f.operator === 'or') {
    sanitized.operator = f.operator;
  } else {
    sanitized.operator = 'or'; // Default
  }

  return sanitized;
}
