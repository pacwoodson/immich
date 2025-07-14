export const DYNAMIC_ALBUM_CONFIG = {
  // Search configuration
  DEFAULT_SEARCH_SIZE: 50000,
  MAX_SEARCH_SIZE: 100000,
  THUMBNAIL_SEARCH_SIZE: 1,

  // Sync configuration
  SYNC_TIME_BUFFER_MS: 1000,

  // Cache configuration
  FILTER_CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
  METADATA_CACHE_TTL_MS: 2 * 60 * 1000, // 2 minutes

  // Performance thresholds
  LARGE_ALBUM_THRESHOLD: 10000,
  PAGINATION_SIZE: 1000,
} as const;

export type DynamicAlbumConfig = typeof DYNAMIC_ALBUM_CONFIG;
