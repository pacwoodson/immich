/**
 * Configuration constants for Dynamic Albums feature
 */

export const DYNAMIC_ALBUM_CONFIG = {
  // Search limits
  DEFAULT_SEARCH_SIZE: 50000, // Default number of assets to fetch
  MAX_SEARCH_SIZE: 100000, // Maximum number of assets in a single query
  THUMBNAIL_SEARCH_SIZE: 1, // Number of assets to fetch for thumbnail selection

  // Cache TTLs (in milliseconds)
  FILTER_CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes - for filter conversion caching
  METADATA_CACHE_TTL_MS: 2 * 60 * 1000, // 2 minutes - for metadata calculation caching

  // Performance thresholds
  LARGE_ALBUM_THRESHOLD: 10000, // Albums with more assets are considered "large"
  PAGINATION_SIZE: 1000, // Default pagination size for large result sets

  // Timeouts (in milliseconds)
  QUERY_TIMEOUT_MS: 30 * 1000, // 30 seconds - timeout for asset queries
} as const;
