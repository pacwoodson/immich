import { AssetType, AssetVisibility } from 'src/enum';

/**
 * Strongly typed search options interface
 */
export interface SearchOptions {
  // User and access control
  userIds?: string[];
  withDeleted?: boolean;
  visibility?: AssetVisibility;

  // Asset filtering
  tagIds?: string[];
  tagOperator?: 'and' | 'or';
  personIds?: string[];
  albumIds?: string[];
  type?: AssetType;
  isFavorite?: boolean;
  isOffline?: boolean;
  isMotion?: boolean;
  isEncoded?: boolean;
  isNotInAlbum?: boolean;

  // Geographic filtering
  city?: string | null;
  state?: string | null;
  country?: string | null;

  // Date filtering
  takenBefore?: Date;
  takenAfter?: Date;
  createdBefore?: Date;
  createdAfter?: Date;
  updatedBefore?: Date;
  updatedAfter?: Date;
  trashedBefore?: Date;
  trashedAfter?: Date;

  // Camera/device filtering
  make?: string;
  model?: string;
  lensModel?: string;
  rating?: number;

  // Path and content filtering
  originalPath?: string;
  originalFileName?: string;
  description?: string;
  libraryId?: string | null;
  deviceId?: string;

  // Additional options
  withExif?: boolean;
  withFaces?: boolean;
  withPeople?: boolean;
  withStacked?: boolean;
  orderDirection?: 'asc' | 'desc';
}

/**
 * Pagination options for search
 */
export interface SearchPaginationOptions {
  page: number;
  size: number;
}

/**
 * Combined search request interface
 */
export interface SearchRequest {
  pagination: SearchPaginationOptions;
  options: SearchOptions;
}

/**
 * Search result item interface
 */
export interface SearchAssetResult {
  id: string;
  ownerId: string;
  visibility: AssetVisibility;
  type: AssetType;
  fileCreatedAt: Date;
  localDateTime: Date;
  updatedAt: Date;
  duration: string | null;
  isFavorite: boolean;
  isOffline: boolean;
  thumbhash: Buffer | null;
  updateId: string;
  exif?: {
    city?: string | null;
    state?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    make?: string | null;
    model?: string | null;
    lensModel?: string | null;
    rating?: number | null;
    projectionType?: string | null;
    exifImageWidth?: number | null;
    exifImageHeight?: number | null;
    orientation?: string | null;
  };
  faces?: Array<{
    id: string;
    personId: string | null;
    boundingBoxX1: number;
    boundingBoxY1: number;
    boundingBoxX2: number;
    boundingBoxY2: number;
  }>;
  livePhotoVideoId?: string | null;
  stackId?: string | null;
  stackCount?: number;
  status: string;
}

/**
 * Search result interface
 */
export interface SearchResult {
  items: SearchAssetResult[];
  hasNextPage: boolean;
}

/**
 * Type guard for SearchOptions
 */
export function isValidSearchOptions(obj: unknown): obj is SearchOptions {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const options = obj as Record<string, unknown>;

  // Check array fields
  if (options.userIds && !Array.isArray(options.userIds)) return false;
  if (options.tagIds && !Array.isArray(options.tagIds)) return false;
  if (options.personIds && !Array.isArray(options.personIds)) return false;
  if (options.albumIds && !Array.isArray(options.albumIds)) return false;

  // Check enum fields
  if (options.type && !Object.values(AssetType).includes(options.type as AssetType)) return false;
  if (options.visibility && !Object.values(AssetVisibility).includes(options.visibility as AssetVisibility))
    return false;
  if (options.tagOperator && !['and', 'or'].includes(options.tagOperator as string)) return false;
  if (options.orderDirection && !['asc', 'desc'].includes(options.orderDirection as string)) return false;

  // Check boolean fields
  const booleanFields = [
    'withDeleted',
    'isFavorite',
    'isOffline',
    'isMotion',
    'isEncoded',
    'isNotInAlbum',
    'withExif',
    'withFaces',
    'withPeople',
    'withStacked',
  ];
  for (const field of booleanFields) {
    if (options[field] !== undefined && typeof options[field] !== 'boolean') return false;
  }

  // Check date fields
  const dateFields = [
    'takenBefore',
    'takenAfter',
    'createdBefore',
    'createdAfter',
    'updatedBefore',
    'updatedAfter',
    'trashedBefore',
    'trashedAfter',
  ];
  for (const field of dateFields) {
    if (options[field] !== undefined && !(options[field] instanceof Date)) return false;
  }

  // Check string fields
  const stringFields = [
    'city',
    'state',
    'country',
    'make',
    'model',
    'lensModel',
    'originalPath',
    'originalFileName',
    'description',
    'libraryId',
    'deviceId',
  ];
  for (const field of stringFields) {
    if (options[field] !== undefined && options[field] !== null && typeof options[field] !== 'string') return false;
  }

  // Check number fields
  if (options.rating !== undefined && typeof options.rating !== 'number') return false;

  return true;
}

/**
 * Convert filter conversion errors
 */
export interface FilterConversionError {
  field: string;
  message: string;
  value: unknown;
}

/**
 * Filter conversion result
 */
export interface FilterConversionResult {
  searchOptions: SearchOptions;
  errors: FilterConversionError[];
  warnings: string[];
}
