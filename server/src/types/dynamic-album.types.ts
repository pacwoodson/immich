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
