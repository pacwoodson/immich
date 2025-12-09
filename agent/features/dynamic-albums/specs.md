# Dynamic Albums - Implementation Specifications

## Overview

This document specifies the complete implementation of Dynamic Albums (Smart Albums) for Immich - a feature that allows users to create albums that automatically populate based on filter criteria rather than manual asset selection.

## Architecture Overview

### Core Concept

Traditional albums require manual asset management. Dynamic Albums use filters to automatically determine membership:
- User defines criteria (tags, people, location, dates, metadata)
- System computes matching assets in real-time
- Album content updates automatically as library changes
- Assets cannot be manually added/removed from dynamic albums

### Technology Stack

**Backend**:
- NestJS with TypeScript
- PostgreSQL with JSONB for filter storage
- Kysely for type-safe SQL queries
- Existing search infrastructure

**Web Frontend**:
- SvelteKit with Svelte 5 (runes API)
- TypeScript SDK (auto-generated from OpenAPI)
- Tailwind CSS for styling

**Mobile**:
- Flutter/Dart
- Riverpod for state management
- Isar for local storage
- Auto-generated Dart SDK

## Database Schema

### Albums Table Extensions

Add two new columns to the existing `albums` table:

```sql
-- Migration: YYYYMMDDHHMMSS-DynamicAlbums.ts
ALTER TABLE albums ADD COLUMN dynamic boolean DEFAULT false NOT NULL;
ALTER TABLE albums ADD COLUMN filters jsonb DEFAULT null;

-- Indexes for performance
CREATE INDEX IDX_albums_dynamic ON albums(dynamic);
CREATE INDEX IDX_albums_filters ON albums USING gin(filters);
```

**Column Specifications**:
- `dynamic`: Boolean flag indicating if album is dynamic (default: false for backward compatibility)
- `filters`: JSONB field storing filter criteria as JSON object (nullable for regular albums)

**Why JSONB?**:
- Flexible schema for evolving filter types
- GIN index enables efficient querying
- Native JSON validation in PostgreSQL
- Easy serialization to/from TypeScript

### Schema Update

Update Kysely schema definition:

**File**: `server/src/schema/tables/album.table.ts`

```typescript
@Column({ type: 'boolean', default: false })
dynamic!: Generated<boolean>;

@Column({ type: 'jsonb', nullable: true })
filters!: object | null;
```

## Data Model

### Filter Structure

```typescript
// server/src/types/dynamic-album.types.ts

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
  make?: string;              // Camera make
  model?: string;             // Camera model
  lensModel?: string;         // Lens model
  rating?: number;            // 0-5 stars
}

export interface DynamicAlbumFilters {
  tags?: string[];            // Array of tag IDs
  people?: string[];          // Array of person IDs
  location?: string | LocationFilter;  // Free-text or structured
  dateRange?: DateRangeFilter;
  assetType?: 'IMAGE' | 'VIDEO';
  metadata?: MetadataFilter;
  operator?: 'and' | 'or';    // How to combine filters (default: 'or')
}
```

### DTOs

**File**: `server/src/dtos/album.dto.ts`

Extend existing DTOs:

```typescript
export class CreateAlbumDto {
  @IsString()
  albumName!: string;

  @Optional()
  @IsString()
  description?: string;

  @ValidateBoolean({ optional: true })
  dynamic?: boolean;

  @Optional()
  filters?: object | null;  // Validated at runtime

  @ValidateUUID({ optional: true, each: true })
  assetIds?: string[];  // Only for non-dynamic albums

  // ... existing fields
}

export class UpdateAlbumDto {
  @Optional()
  @IsString()
  albumName?: string;

  @Optional()
  @IsString()
  description?: string;

  @ValidateBoolean({ optional: true })
  dynamic?: boolean;

  @Optional()
  filters?: object | null;

  // ... existing fields
}
```

## Implementation Phases

## Phase 1: Backend Foundation

### 1.1 Type System & Validation

**File**: `server/src/types/dynamic-album.types.ts` (new file)

**Implement**:

1. **Type Definitions**: All filter interfaces (shown above)

2. **Type Guards**: Runtime type checking
   ```typescript
   export function isDynamicAlbumFilters(obj: unknown): obj is DynamicAlbumFilters
   export function isLocationFilter(obj: unknown): obj is LocationFilter
   export function isDateRangeFilter(obj: unknown): obj is DateRangeFilter
   export function isMetadataFilter(obj: unknown): obj is MetadataFilter
   ```

3. **Validation Function**: Comprehensive validation with detailed errors
   ```typescript
   export interface DynamicAlbumFilterValidationError {
     field: string;
     message: string;
     value: unknown;
   }

   export interface DynamicAlbumFilterValidationResult {
     isValid: boolean;
     errors: DynamicAlbumFilterValidationError[];
     warnings: string[];
   }

   export function validateDynamicAlbumFilters(
     filters: unknown
   ): DynamicAlbumFilterValidationResult
   ```

4. **Sanitization Function**: Clean and normalize input
   ```typescript
   export function sanitizeDynamicAlbumFilters(
     filters: unknown
   ): DynamicAlbumFilters
   ```

**Validation Rules**:
- Tags/people: Must be non-empty string arrays, no duplicates
- Location: Either non-empty string OR valid LocationFilter with at least one field
- Date range: Start must be <= end, both must be valid dates
- Asset type: Must be 'IMAGE' or 'VIDEO'
- Metadata: Each field must match its type (boolean, string, number)
- Rating: Must be 0-5
- Operator: Must be 'and' or 'or'

### 1.2 Database Migration

**File**: `server/src/migrations/YYYYMMDDHHMMSS-DynamicAlbums.ts` (new file)

```typescript
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE albums
    ADD COLUMN dynamic boolean DEFAULT false NOT NULL
  `.execute(db);

  await sql`
    ALTER TABLE albums
    ADD COLUMN filters jsonb DEFAULT null
  `.execute(db);

  await sql`
    CREATE INDEX IDX_albums_dynamic ON albums(dynamic)
  `.execute(db);

  await sql`
    CREATE INDEX IDX_albums_filters ON albums USING gin(filters)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS IDX_albums_dynamic`.execute(db);
  await sql`DROP INDEX IF EXISTS IDX_albums_filters`.execute(db);
  await sql`ALTER TABLE albums DROP COLUMN IF EXISTS filters`.execute(db);
  await sql`ALTER TABLE albums DROP COLUMN IF EXISTS dynamic`.execute(db);
}
```

**Generate migration**:
```bash
cd server
pnpm run migrations:generate
# Review generated SQL
pnpm run migrations:run
```

### 1.3 Configuration

**File**: `server/src/config/dynamic-albums.config.ts` (new file)

```typescript
export const DYNAMIC_ALBUM_CONFIG = {
  // Search limits
  DEFAULT_SEARCH_SIZE: 50000,
  MAX_SEARCH_SIZE: 100000,
  THUMBNAIL_SEARCH_SIZE: 1,

  // Cache TTLs
  FILTER_CACHE_TTL_MS: 5 * 60 * 1000,      // 5 minutes
  METADATA_CACHE_TTL_MS: 2 * 60 * 1000,    // 2 minutes

  // Performance
  LARGE_ALBUM_THRESHOLD: 10000,
  PAGINATION_SIZE: 1000,
} as const;
```

### 1.4 Dynamic Album Repository

**File**: `server/src/repositories/dynamic-album.repository.ts` (new file)

**Purpose**: Centralized service for querying assets based on dynamic album filters

**Core Methods**:

```typescript
@Injectable()
export class DynamicAlbumRepository {
  constructor(private searchRepository: SearchRepository) {}

  /**
   * Get assets matching dynamic album filters
   */
  async getAssets(
    filters: DynamicAlbumFilters,
    ownerId: string,
    options?: {
      page?: number;
      size?: number;
      order?: AssetOrder;
      withExif?: boolean;
    }
  ): Promise<{ items: Asset[]; hasNextPage: boolean }>

  /**
   * Calculate metadata for a dynamic album
   */
  async getMetadata(
    filters: DynamicAlbumFilters,
    ownerId: string
  ): Promise<{
    assetCount: number;
    startDate: Date | null;
    endDate: Date | null;
    lastModifiedAssetTimestamp: Date | null;
  }>

  /**
   * Get thumbnail asset ID
   */
  async getThumbnailAssetId(
    filters: DynamicAlbumFilters,
    ownerId: string
  ): Promise<string | null>

  /**
   * Check if specific asset belongs to dynamic album
   */
  async isAssetInDynamicAlbum(
    assetId: string,
    filters: DynamicAlbumFilters,
    ownerId: string
  ): Promise<boolean>
}
```

**Implementation Details**:
- Use `searchRepository.searchMetadata()` for querying
- Convert `DynamicAlbumFilters` → `SearchOptions`
- Implement caching for filter conversions (5 min TTL)
- Safe execution with error handling and fallbacks
- Support for timeouts (30s default)

**Register in module**:

**File**: `server/src/repositories/index.ts`

```typescript
export { DynamicAlbumRepository } from './dynamic-album.repository';
```

**File**: `server/src/services/base.service.ts`

```typescript
@Inject(DynamicAlbumRepository)
protected dynamicAlbumRepository!: DynamicAlbumRepository;
```

### 1.5 Search Integration

**File**: `server/src/utils/database.ts`

**Enhance `hasTags()` function** to support AND/OR operators:

```typescript
export function hasTags<O>(
  qb: SelectQueryBuilder<DB, 'assets', O>,
  tagIds: string[],
  operator: 'and' | 'or' = 'and'
) {
  if (operator === 'and') {
    // All tags must be present (existing logic)
    return qb.innerJoin(/* ... */);
  } else {
    // Any tag can be present (OR logic)
    return qb.where((eb) =>
      eb.exists(
        eb.selectFrom('tag_asset')
          .innerJoin('tags_closure', 'tag_asset.tagsId', 'tags_closure.id_descendant')
          .whereRef('tag_asset.assetsId', '=', 'assets.id')
          .where('tags_closure.id_ancestor', 'in', tagIds)
      )
    );
  }
}
```

**Add filter conversion utility**:

```typescript
export function convertDynamicAlbumFiltersToSearchOptions(
  filters: DynamicAlbumFilters,
  userId: string
): SearchOptions {
  const sanitized = sanitizeDynamicAlbumFilters(filters);
  const validation = validateDynamicAlbumFilters(sanitized);

  if (!validation.isValid) {
    throw new Error(`Invalid filters: ${validation.errors.map(e => e.message).join(', ')}`);
  }

  const searchOptions: SearchOptions = {
    userIds: [userId],
  };

  // Convert tags
  if (sanitized.tags && sanitized.tags.length > 0) {
    searchOptions.tagIds = sanitized.tags;
    searchOptions.tagOperator = sanitized.operator === 'or' ? 'or' : 'and';
  }

  // Convert people
  if (sanitized.people && sanitized.people.length > 0) {
    searchOptions.personIds = sanitized.people;
  }

  // Convert location
  if (sanitized.location) {
    if (typeof sanitized.location === 'string') {
      // Free-text location search (implementation depends on search repo)
      searchOptions.locationSearch = sanitized.location;
    } else {
      searchOptions.city = sanitized.location.city;
      searchOptions.state = sanitized.location.state;
      searchOptions.country = sanitized.location.country;
    }
  }

  // Convert date range
  if (sanitized.dateRange) {
    searchOptions.takenAfter = new Date(sanitized.dateRange.start);
    searchOptions.takenBefore = new Date(sanitized.dateRange.end);
  }

  // Convert asset type
  if (sanitized.assetType) {
    searchOptions.type = sanitized.assetType === 'IMAGE' ? AssetType.IMAGE : AssetType.VIDEO;
  }

  // Convert metadata
  if (sanitized.metadata) {
    if (sanitized.metadata.isFavorite !== undefined) {
      searchOptions.isFavorite = sanitized.metadata.isFavorite;
    }
    if (sanitized.metadata.make) {
      searchOptions.make = sanitized.metadata.make;
    }
    if (sanitized.metadata.model) {
      searchOptions.model = sanitized.metadata.model;
    }
    if (sanitized.metadata.lensModel) {
      searchOptions.lensModel = sanitized.metadata.lensModel;
    }
    if (sanitized.metadata.rating !== undefined) {
      searchOptions.rating = sanitized.metadata.rating;
    }
  }

  return searchOptions;
}
```

**Extend SearchOptions type** if needed:

**File**: `server/src/repositories/search.repository.ts`

Ensure `SearchOptions` interface supports:
- `tagIds` with `tagOperator?: 'and' | 'or'`
- `personIds`
- `city`, `state`, `country`
- `takenAfter`, `takenBefore`
- `type`, `isFavorite`
- `make`, `model`, `lensModel`, `rating`

Update `searchMetadata()` to handle all these filters.

### 1.6 Album Service Integration

**File**: `server/src/services/album.service.ts`

**Modify `getAll()` method**:

```typescript
async getAll({ user: { id: ownerId } }: AuthDto, dto: GetAlbumsDto): Promise<AlbumResponseDto[]> {
  await this.albumRepository.updateThumbnails();

  let albums: MapAlbumDto[];
  // ... existing logic to get albums

  // Separate regular and dynamic albums
  const regularAlbums = albums.filter((album) => !album.dynamic);
  const dynamicAlbums = albums.filter((album) => album.dynamic);

  // Get metadata for regular albums (existing logic)
  const regularAlbumIds = regularAlbums.map((a) => a.id);
  const results = regularAlbumIds.length > 0
    ? await this.albumRepository.getMetadataForIds(regularAlbumIds)
    : [];
  const albumMetadata: Record<string, AlbumAssetCount> = {};
  for (const metadata of results) {
    albumMetadata[metadata.albumId] = metadata;
  }

  // Calculate metadata for dynamic albums
  for (const dynamicAlbum of dynamicAlbums) {
    if (dynamicAlbum.filters) {
      const metadata = await this.dynamicAlbumRepository.getMetadata(
        dynamicAlbum.filters as DynamicAlbumFilters,
        ownerId
      );

      // Update thumbnail if needed
      if (!dynamicAlbum.albumThumbnailAssetId && metadata.assetCount > 0) {
        const thumbnailId = await this.dynamicAlbumRepository.getThumbnailAssetId(
          dynamicAlbum.filters as DynamicAlbumFilters,
          ownerId
        );
        if (thumbnailId) {
          await this.albumRepository.update(dynamicAlbum.id, {
            id: dynamicAlbum.id,
            albumThumbnailAssetId: thumbnailId,
          });
          dynamicAlbum.albumThumbnailAssetId = thumbnailId;
        }
      }

      albumMetadata[dynamicAlbum.id] = {
        albumId: dynamicAlbum.id,
        assetCount: metadata.assetCount,
        startDate: metadata.startDate,
        endDate: metadata.endDate,
        lastModifiedAssetTimestamp: metadata.lastModifiedAssetTimestamp,
      };
    }
  }

  return albums.map((album) => ({
    ...mapAlbumWithoutAssets(album),
    assetCount: albumMetadata[album.id]?.assetCount || 0,
    startDate: albumMetadata[album.id]?.startDate ?? undefined,
    endDate: albumMetadata[album.id]?.endDate ?? undefined,
    lastModifiedAssetTimestamp: albumMetadata[album.id]?.lastModifiedAssetTimestamp ?? undefined,
  }));
}
```

**Modify `get()` method**:

```typescript
async get(auth: AuthDto, id: string, dto: AlbumInfoDto): Promise<AlbumResponseDto> {
  await this.requireAccess({ auth, permission: Permission.ALBUM_READ, ids: [id] });
  await this.albumRepository.updateThumbnails();

  const album = await this.findOrFail(id, { withAssets: false });

  // Handle dynamic albums
  if (album.dynamic && album.filters) {
    const searchResult = await this.dynamicAlbumRepository.getAssets(
      album.filters as DynamicAlbumFilters,
      auth.user.id,
      { size: 50000, order: album.order }
    );

    const assets = searchResult.items || [];

    // Update thumbnail if needed
    if (!album.albumThumbnailAssetId && assets.length > 0) {
      const thumbnailId = assets[0].id;
      await this.albumRepository.update(album.id, {
        id: album.id,
        albumThumbnailAssetId: thumbnailId,
      });
      album.albumThumbnailAssetId = thumbnailId;
    }

    const metadata = await this.dynamicAlbumRepository.getMetadata(
      album.filters as DynamicAlbumFilters,
      auth.user.id
    );

    return {
      ...mapAlbum(album, dto.withoutAssets ? [] : assets),
      assetCount: metadata.assetCount,
      startDate: metadata.startDate ?? undefined,
      endDate: metadata.endDate ?? undefined,
      lastModifiedAssetTimestamp: metadata.lastModifiedAssetTimestamp ?? undefined,
    };
  }

  // Regular album logic (existing)
  return this.findOrFail(id, { withAssets: !dto.withoutAssets });
}
```

**Validation in `create()` and `update()`**:

```typescript
async create(auth: AuthDto, dto: CreateAlbumDto): Promise<AlbumResponseDto> {
  // Validate dynamic album filters
  if (dto.dynamic && dto.filters) {
    const validation = validateDynamicAlbumFilters(dto.filters);
    if (!validation.isValid) {
      throw new BadRequestException(
        `Invalid filters: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }
    // Sanitize filters
    dto.filters = sanitizeDynamicAlbumFilters(dto.filters);
  }

  // Dynamic albums cannot have manual assets
  if (dto.dynamic && dto.assetIds && dto.assetIds.length > 0) {
    throw new BadRequestException('Dynamic albums cannot have manually added assets');
  }

  // ... rest of create logic
}
```

### 1.7 API Endpoints

**Add new endpoints** (in `AlbumService`):

```typescript
/**
 * Preview assets matching filters before creating album
 */
async previewDynamicAlbum(
  auth: AuthDto,
  filters: DynamicAlbumFilters
): Promise<{ count: number; thumbnails: AssetResponseDto[] }> {
  const validation = validateDynamicAlbumFilters(filters);
  if (!validation.isValid) {
    throw new BadRequestException('Invalid filters');
  }

  const result = await this.dynamicAlbumRepository.getAssets(
    filters,
    auth.user.id,
    { size: 10 }
  );

  const metadata = await this.dynamicAlbumRepository.getMetadata(
    filters,
    auth.user.id
  );

  return {
    count: metadata.assetCount,
    thumbnails: result.items.map(mapAsset),
  };
}

/**
 * Validate filters
 */
async validateFilters(
  filters: DynamicAlbumFilters
): Promise<DynamicAlbumFilterValidationResult> {
  return validateDynamicAlbumFilters(filters);
}
```

**Register in controller** (if separate controller needed, or add to AlbumController):

```typescript
@Post('dynamic/preview')
async previewDynamicAlbum(
  @Auth() auth: AuthDto,
  @Body() filters: DynamicAlbumFilters
) {
  return this.albumService.previewDynamicAlbum(auth, filters);
}

@Post('dynamic/validate')
async validateFilters(@Body() filters: DynamicAlbumFilters) {
  return this.albumService.validateFilters(filters);
}
```

### 1.8 OpenAPI & SDK Generation

**Update OpenAPI spec**:

```bash
make open-api
```

This will:
- Generate TypeScript SDK for web (`open-api/typescript-sdk/`)
- Generate Dart SDK for mobile (`mobile/openapi/`)
- Update `open-api/immich-openapi-specs.json`

**Verify generated types**:
- `CreateAlbumDto` has `dynamic` and `filters` fields
- `UpdateAlbumDto` has `dynamic` and `filters` fields
- `AlbumResponseDto` reflects changes

### 1.9 Backend Testing

**File**: `server/test/repositories/dynamic-album.repository.spec.ts` (new file)

Test all DynamicAlbumRepository methods:
- `getAssets()` with various filter combinations
- `getMetadata()` calculation
- `getThumbnailAssetId()`
- `isAssetInDynamicAlbum()`
- Error handling
- Caching behavior

**File**: `server/test/services/album.service.spec.ts` (enhance existing)

Add tests for:
- Creating dynamic albums
- Updating filters
- Getting dynamic album with computed assets
- Validation errors
- Cannot add manual assets to dynamic albums

**File**: `server/test/utils/database.spec.ts` (enhance existing)

Test:
- `hasTags()` with AND/OR operators
- `convertDynamicAlbumFiltersToSearchOptions()`
- Filter validation and sanitization

**Run tests**:
```bash
make test-server
```

Target: 80%+ coverage for new code

## Phase 2: Web Frontend

### 2.1 Filter Component Library

Create reusable filter selection components:

#### Tag Selector

**File**: `web/src/lib/components/shared-components/tag-selector.svelte` (new file)

```svelte
<script lang="ts">
  import { getAllTags, type TagResponseDto } from '@immich/sdk';
  import { onMount } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';

  interface Props {
    selectedTagIds: SvelteSet<string>;
    onTagsChange?: (tags: SvelteSet<string>) => void;
  }

  let { selectedTagIds, onTagsChange }: Props = $props();

  let allTags: TagResponseDto[] = $state([]);
  let filteredTags = $derived(/* filter logic */);

  onMount(async () => {
    allTags = await getAllTags();
  });

  function toggleTag(tagId: string) {
    if (selectedTagIds.has(tagId)) {
      selectedTagIds.delete(tagId);
    } else {
      selectedTagIds.add(tagId);
    }
    onTagsChange?.(selectedTagIds);
  }
</script>

<!-- Multi-select UI with search -->
```

#### People Selector

**File**: `web/src/lib/components/shared-components/people-selector.svelte` (new file)

```svelte
<script lang="ts">
  import { getAllPeople, type PersonResponseDto } from '@immich/sdk';
  import { SvelteSet } from 'svelte/reactivity';

  interface Props {
    selectedPeopleIds: SvelteSet<string>;
    onPeopleChange?: (people: SvelteSet<string>) => void;
  }

  let { selectedPeopleIds, onPeopleChange }: Props = $props();

  // Similar to tag selector but with person thumbnails
</script>
```

#### Location Filter

**File**: `web/src/lib/components/shared-components/location-filter.svelte` (new file)

```svelte
<script lang="ts">
  interface Props {
    location: string | { city?: string; state?: string; country?: string };
    onLocationChange: (location: any) => void;
  }

  let { location, onLocationChange }: Props = $props();

  let mode = $state<'text' | 'structured'>('text');

  // Toggle between free-text and structured location input
  // Autocomplete using existing location data from assets
</script>
```

#### Date Range Picker

**File**: `web/src/lib/components/shared-components/date-range-picker.svelte` (new file)

```svelte
<script lang="ts">
  interface Props {
    startDate?: Date;
    endDate?: Date;
    onDateRangeChange: (start: Date, end: Date) => void;
  }

  let { startDate, endDate, onDateRangeChange }: Props = $props();

  // Date inputs with quick presets (last week, month, year, etc.)
</script>
```

#### Metadata Filters

**File**: `web/src/lib/components/shared-components/metadata-filter.svelte` (new file)

```svelte
<script lang="ts">
  interface Props {
    metadata: {
      isFavorite?: boolean;
      make?: string;
      model?: string;
      lensModel?: string;
      rating?: number;
    };
    onMetadataChange: (metadata: any) => void;
  }

  let { metadata, onMetadataChange }: Props = $props();

  // Favorite toggle, camera/lens autocomplete, star rating
</script>
```

#### Operator Selector

**File**: `web/src/lib/components/shared-components/filter-operator-selector.svelte` (new file)

```svelte
<script lang="ts">
  import { mdiPlus, mdiMultiplication } from '@mdi/js';

  interface Props {
    operator: 'and' | 'or';
    onOperatorChange: (op: 'and' | 'or') => void;
  }

  let { operator, onOperatorChange }: Props = $props();

  // Visual toggle with icons and tooltips
</script>
```

### 2.2 Dynamic Album Filters Modal

**File**: `web/src/lib/modals/DynamicAlbumFiltersModal.svelte` (new file)

```svelte
<script lang="ts">
  import TagSelector from '$lib/components/shared-components/tag-selector.svelte';
  import PeopleSelector from '$lib/components/shared-components/people-selector.svelte';
  import LocationFilter from '$lib/components/shared-components/location-filter.svelte';
  import DateRangePicker from '$lib/components/shared-components/date-range-picker.svelte';
  import MetadataFilter from '$lib/components/shared-components/metadata-filter.svelte';
  import FilterOperatorSelector from '$lib/components/shared-components/filter-operator-selector.svelte';
  import { Modal, Button } from '@immich/ui';
  import { SvelteSet } from 'svelte/reactivity';
  import type { DynamicAlbumFilters } from '@immich/sdk'; // or local type

  interface Props {
    initialFilters?: DynamicAlbumFilters;
    onSave: (filters: DynamicAlbumFilters) => void;
    onClose: () => void;
  }

  let { initialFilters, onSave, onClose }: Props = $props();

  // State for each filter type
  let selectedTagIds = $state(new SvelteSet<string>(initialFilters?.tags || []));
  let selectedPeopleIds = $state(new SvelteSet<string>(initialFilters?.people || []));
  let location = $state(initialFilters?.location);
  let dateRange = $state(initialFilters?.dateRange);
  let assetType = $state(initialFilters?.assetType);
  let metadata = $state(initialFilters?.metadata || {});
  let operator = $state<'and' | 'or'>(initialFilters?.operator || 'or');

  // Preview
  let previewCount = $state<number | null>(null);
  let isLoadingPreview = $state(false);

  async function loadPreview() {
    isLoadingPreview = true;
    try {
      const filters = buildFilters();
      const result = await previewDynamicAlbum({ filters }); // API call
      previewCount = result.count;
    } catch (error) {
      console.error('Preview failed', error);
    } finally {
      isLoadingPreview = false;
    }
  }

  // Debounce preview updates
  $effect(() => {
    // Watch filter changes
    const debounce = setTimeout(() => loadPreview(), 500);
    return () => clearTimeout(debounce);
  });

  function buildFilters(): DynamicAlbumFilters {
    const filters: DynamicAlbumFilters = { operator };
    if (selectedTagIds.size > 0) filters.tags = [...selectedTagIds];
    if (selectedPeopleIds.size > 0) filters.people = [...selectedPeopleIds];
    if (location) filters.location = location;
    if (dateRange) filters.dateRange = dateRange;
    if (assetType) filters.assetType = assetType;
    if (Object.keys(metadata).length > 0) filters.metadata = metadata;
    return filters;
  }

  function handleSave() {
    const filters = buildFilters();
    onSave(filters);
  }
</script>

<Modal title="Configure Dynamic Album Filters" {onClose}>
  <div class="space-y-4">
    <!-- Operator selector at top -->
    <FilterOperatorSelector bind:operator />

    <!-- All filter components -->
    <section>
      <h3>Tags</h3>
      <TagSelector bind:selectedTagIds />
    </section>

    <section>
      <h3>People</h3>
      <PeopleSelector bind:selectedPeopleIds />
    </section>

    <section>
      <h3>Location</h3>
      <LocationFilter bind:location />
    </section>

    <section>
      <h3>Date Range</h3>
      <DateRangePicker bind:dateRange />
    </section>

    <section>
      <h3>Asset Type</h3>
      <!-- Radio buttons for Image/Video/Both -->
    </section>

    <section>
      <h3>Metadata</h3>
      <MetadataFilter bind:metadata />
    </section>

    <!-- Preview -->
    <div class="preview">
      {#if isLoadingPreview}
        <p>Loading preview...</p>
      {:else if previewCount !== null}
        <p>{previewCount} assets match these filters</p>
      {/if}
    </div>
  </div>

  <div slot="footer">
    <Button variant="secondary" on:click={onClose}>Cancel</Button>
    <Button on:click={handleSave}>Save Filters</Button>
  </div>
</Modal>
```

### 2.3 Create Album Modal Enhancement

**File**: `web/src/lib/modals/CreateAlbumModal.svelte` (modify existing)

```svelte
<script lang="ts">
  import { createAlbum, type AlbumResponseDto } from '@immich/sdk';
  import { Modal, Button, Toggle } from '@immich/ui';
  import DynamicAlbumFiltersModal from './DynamicAlbumFiltersModal.svelte';

  interface Props {
    onClose: (album?: AlbumResponseDto) => void;
    assetIds?: string[];
    initialIsDynamic?: boolean;
    initialFilters?: any;
  }

  let { onClose, assetIds = [], initialIsDynamic = false, initialFilters }: Props = $props();

  let albumName = $state('');
  let description = $state('');
  let isDynamic = $state(initialIsDynamic);
  let filters = $state(initialFilters || {});
  let showFilterModal = $state(false);

  let isValid = $derived(
    albumName.trim().length > 0 &&
    (!isDynamic || hasFilters(filters))
  );

  function hasFilters(f: any): boolean {
    return f.tags?.length > 0 || f.people?.length > 0 || !!f.location ||
           !!f.dateRange || !!f.assetType || !!f.metadata;
  }

  async function handleSubmit() {
    const dto: any = {
      albumName: albumName.trim(),
      description: description.trim() || undefined,
      dynamic: isDynamic,
    };

    if (isDynamic) {
      dto.filters = filters;
    } else if (assetIds.length > 0) {
      dto.assetIds = assetIds;
    }

    const album = await createAlbum({ createAlbumDto: dto });
    onClose(album);
  }
</script>

<Modal title="Create Album" onClose={() => onClose()}>
  <div class="space-y-4">
    <input type="text" bind:value={albumName} placeholder="Album name" />
    <textarea bind:value={description} placeholder="Description (optional)" />

    <Toggle bind:checked={isDynamic}>
      <span>Dynamic Album</span>
      <span class="text-sm text-gray-500">Automatically includes matching assets</span>
    </Toggle>

    {#if isDynamic}
      <Button on:click={() => showFilterModal = true}>
        Configure Filters
      </Button>

      {#if hasFilters(filters)}
        <div class="filter-summary">
          <!-- Show filter summary -->
          {filters.tags?.length || 0} tags,
          {filters.people?.length || 0} people
          <!-- etc -->
        </div>
      {/if}
    {/if}
  </div>

  <div slot="footer">
    <Button variant="secondary" on:click={() => onClose()}>Cancel</Button>
    <Button on:click={handleSubmit} disabled={!isValid}>Create</Button>
  </div>
</Modal>

{#if showFilterModal}
  <DynamicAlbumFiltersModal
    initialFilters={filters}
    onSave={(newFilters) => {
      filters = newFilters;
      showFilterModal = false;
    }}
    onClose={() => showFilterModal = false}
  />
{/if}
```

### 2.4 Album Viewer Enhancement

**File**: `web/src/routes/(user)/albums/[albumId]/[[photos=photos]]/[[assetId=id]]/+page.svelte`

**Add**:
- Dynamic album indicator badge
- Display filter summary
- "Edit Filters" button (opens filter modal)
- Disable manual add/remove buttons for dynamic albums

```svelte
<script lang="ts">
  // ... existing code

  let album = $state(/* ... */);
  let showFilterModal = $state(false);

  async function handleFilterUpdate(newFilters: any) {
    await updateAlbum({
      id: album.id,
      updateAlbumDto: { filters: newFilters }
    });
    // Refresh album
    showFilterModal = false;
  }
</script>

{#if album.dynamic}
  <div class="dynamic-badge">Dynamic Album</div>

  <FilterDisplay filters={album.filters} />

  {#if canEdit}
    <Button on:click={() => showFilterModal = true}>
      Edit Filters
    </Button>
  {/if}
{/if}

<!-- Disable manual asset controls if dynamic -->
{#if !album.dynamic}
  <!-- Show add/remove asset buttons -->
{/if}

{#if showFilterModal}
  <DynamicAlbumFiltersModal
    initialFilters={album.filters}
    onSave={handleFilterUpdate}
    onClose={() => showFilterModal = false}
  />
{/if}
```

### 2.5 Filter Display Component

**File**: `web/src/lib/components/shared-components/filter-display.svelte` (new file)

```svelte
<script lang="ts">
  import { getAllTags, type TagResponseDto } from '@immich/sdk';
  import { onMount } from 'svelte';

  interface Props {
    filters: any;
    clickable?: boolean;
    onClick?: () => void;
  }

  let { filters, clickable = false, onClick }: Props = $props();

  let allTags: TagResponseDto[] = $state([]);
  let tagMap = $derived(Object.fromEntries(allTags.map((tag) => [tag.id, tag])));

  onMount(async () => {
    allTags = await getAllTags();
  });
</script>

<div class="filter-display" class:clickable on:click={onClick}>
  {#if filters?.tags?.length > 0}
    <div class="filter-item">
      <span class="label">Tags ({filters.operator}):</span>
      <span class="value">
        {filters.tags.map(id => tagMap[id]?.value || id).join(', ')}
      </span>
    </div>
  {/if}

  {#if filters?.people?.length > 0}
    <div class="filter-item">
      <span class="label">People:</span>
      <span class="value">{filters.people.length} people</span>
    </div>
  {/if}

  {#if filters?.location}
    <div class="filter-item">
      <span class="label">Location:</span>
      <span class="value">
        {typeof filters.location === 'string'
          ? filters.location
          : [filters.location.city, filters.location.state, filters.location.country]
              .filter(Boolean).join(', ')}
      </span>
    </div>
  {/if}

  {#if filters?.dateRange}
    <div class="filter-item">
      <span class="label">Date Range:</span>
      <span class="value">
        {new Date(filters.dateRange.start).toLocaleDateString()} -
        {new Date(filters.dateRange.end).toLocaleDateString()}
      </span>
    </div>
  {/if}

  {#if filters?.assetType}
    <div class="filter-item">
      <span class="label">Type:</span>
      <span class="value">{filters.assetType}</span>
    </div>
  {/if}

  {#if filters?.metadata}
    <!-- Display metadata filters -->
  {/if}
</div>
```

### 2.6 Quick Actions

**Tags Page** (`web/src/routes/(user)/tags/[tagId]/[[photos=photos]]/[[assetId=id]]/+page.svelte`):

Add button to create dynamic album from current tag:

```svelte
<Button on:click={createDynamicAlbumFromTag}>
  Create Dynamic Album
</Button>

<script lang="ts">
  async function createDynamicAlbumFromTag() {
    const filters = {
      tags: [tag.id],
      operator: 'or'
    };
    // Open CreateAlbumModal with pre-filled filters
    // or directly create album and navigate
  }
</script>
```

**People Page**: Similar implementation

**Search Results**: "Save as Dynamic Album" button

### 2.7 Web Testing

**File**: `e2e/web/dynamic-albums.spec.ts` (new file)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Dynamic Albums', () => {
  test('create dynamic album with tag filter', async ({ page }) => {
    // Navigate to albums page
    // Click "New Album"
    // Toggle "Dynamic Album"
    // Configure filters (select tags)
    // Save
    // Verify album created
    // Verify assets match
  });

  test('edit dynamic album filters', async ({ page }) => {
    // Open dynamic album
    // Click "Edit Filters"
    // Modify filters
    // Save
    // Verify asset list updated
  });

  test('preview filters before saving', async ({ page }) => {
    // Open create album modal
    // Configure filters
    // Verify preview shows asset count
  });

  test('cannot manually add assets to dynamic album', async ({ page }) => {
    // Open dynamic album
    // Verify add asset buttons are disabled/hidden
  });
});
```

## Phase 3: Mobile Implementation

### 3.1 Isar Schema Extension

**File**: `mobile/lib/modules/album/models/album.dart`

```dart
@collection
class Album {
  Id? id;
  String? remoteId;
  @Index()
  String albumName;
  String? description;
  bool dynamic;  // NEW
  String? filtersJson;  // NEW - store as JSON string
  DateTime? lastSyncedAt;
  // ... existing fields
}
```

### 3.2 Filter Models

**File**: `mobile/lib/modules/album/models/dynamic_album_filters.dart` (new file)

```dart
class DynamicAlbumFilters {
  List<String>? tags;
  List<String>? people;
  dynamic location;  // String or LocationFilter
  DateRangeFilter? dateRange;
  String? assetType;  // 'IMAGE' or 'VIDEO'
  MetadataFilter? metadata;
  String operator;  // 'and' or 'or'

  DynamicAlbumFilters({
    this.tags,
    this.people,
    this.location,
    this.dateRange,
    this.assetType,
    this.metadata,
    this.operator = 'or',
  });

  // JSON serialization
  factory DynamicAlbumFilters.fromJson(Map<String, dynamic> json) { }
  Map<String, dynamic> toJson() { }
}

class LocationFilter {
  String? city;
  String? state;
  String? country;
}

class DateRangeFilter {
  DateTime start;
  DateTime end;
}

class MetadataFilter {
  bool? isFavorite;
  String? make;
  String? model;
  String? lensModel;
  int? rating;
}
```

### 3.3 Dynamic Album Editor Provider

**File**: `mobile/lib/modules/album/providers/dynamic_album_editor.provider.dart` (new file)

```dart
@riverpod
class DynamicAlbumEditor extends _$DynamicAlbumEditor {
  @override
  DynamicAlbumFilters build() => DynamicAlbumFilters();

  void setTags(List<String> tags) {
    state = state.copyWith(tags: tags);
  }

  void setPeople(List<String> people) {
    state = state.copyWith(people: people);
  }

  void setLocation(dynamic location) {
    state = state.copyWith(location: location);
  }

  void setDateRange(DateTime start, DateTime end) {
    state = state.copyWith(
      dateRange: DateRangeFilter(start: start, end: end),
    );
  }

  void setOperator(String operator) {
    state = state.copyWith(operator: operator);
  }

  Future<int> previewCount() async {
    final api = ref.read(apiServiceProvider);
    final result = await api.albumApi.previewDynamicAlbum(
      filters: state.toJson(),
    );
    return result?.count ?? 0;
  }

  Future<Album> save(String name, String? description) async {
    final api = ref.read(apiServiceProvider);
    final album = await api.albumApi.createAlbum(
      CreateAlbumDto(
        albumName: name,
        description: description,
        dynamic: true,
        filters: state.toJson(),
      ),
    );
    return album;
  }
}
```

### 3.4 Filter Editor UI

**File**: `mobile/lib/modules/album/ui/dynamic_album_filter_editor.dart` (new file)

```dart
class DynamicAlbumFilterEditor extends ConsumerWidget {
  const DynamicAlbumFilterEditor({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filters = ref.watch(dynamicAlbumEditorProvider);

    return Scaffold(
      appBar: AppBar(title: Text('Configure Filters')),
      body: ListView(
        children: [
          // Operator toggle
          OperatorSelector(
            value: filters.operator,
            onChanged: (op) => ref.read(dynamicAlbumEditorProvider.notifier).setOperator(op),
          ),

          // Tag selector
          TagSelectorWidget(
            selectedTags: filters.tags ?? [],
            onChanged: (tags) => ref.read(dynamicAlbumEditorProvider.notifier).setTags(tags),
          ),

          // People selector
          PeopleSelectorWidget(
            selectedPeople: filters.people ?? [],
            onChanged: (people) => ref.read(dynamicAlbumEditorProvider.notifier).setPeople(people),
          ),

          // Location filter
          LocationFilterWidget(
            location: filters.location,
            onChanged: (loc) => ref.read(dynamicAlbumEditorProvider.notifier).setLocation(loc),
          ),

          // Date range
          DateRangePickerWidget(
            dateRange: filters.dateRange,
            onChanged: (start, end) =>
              ref.read(dynamicAlbumEditorProvider.notifier).setDateRange(start, end),
          ),

          // Asset type
          // Metadata filters
        ],
      ),
      bottomSheet: PreviewBar(),
    );
  }
}
```

**File**: `mobile/lib/modules/album/ui/tag_selector_widget.dart` (new file)

Implement tag selection UI with search and multi-select.

**File**: `mobile/lib/modules/album/ui/people_selector_widget.dart` (new file)

Implement people selection with thumbnails.

**File**: `mobile/lib/modules/album/ui/date_range_picker_widget.dart` (new file)

Native date range picker.

### 3.5 Album Creation Flow

**File**: `mobile/lib/modules/album/views/create_album_page.dart` (modify existing)

Add toggle for dynamic albums:

```dart
bool isDynamic = false;
DynamicAlbumFilters? filters;

// In build:
SwitchListTile(
  title: Text('Dynamic Album'),
  subtitle: Text('Automatically includes matching assets'),
  value: isDynamic,
  onChanged: (value) => setState(() => isDynamic = value),
),

if (isDynamic)
  ElevatedButton(
    onPressed: () async {
      // Navigate to filter editor
      filters = await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => DynamicAlbumFilterEditor(),
        ),
      );
    },
    child: Text('Configure Filters'),
  ),

// On save:
if (isDynamic) {
  album = await ref.read(albumServiceProvider).createDynamicAlbum(
    name: nameController.text,
    description: descController.text,
    filters: filters!,
  );
} else {
  // Regular album logic
}
```

### 3.6 Album Viewing

**File**: `mobile/lib/modules/album/views/album_viewer_page.dart` (modify existing)

```dart
@override
Widget build(BuildContext context, WidgetRef ref) {
  final album = ref.watch(albumProvider(albumId));

  return Scaffold(
    appBar: AlbumViewerAppBar(
      album: album,
      // Show "Edit Filters" if dynamic
      actions: album.dynamic
        ? [
            IconButton(
              icon: Icon(Icons.edit),
              onPressed: () => _editFilters(album),
            ),
          ]
        : /* regular actions */,
    ),
    body: album.dynamic
      ? DynamicAlbumAssetGrid(album: album)
      : RegularAlbumAssetGrid(album: album),
  );
}

Future<void> _editFilters(Album album) async {
  final newFilters = await Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => DynamicAlbumFilterEditor(
        initialFilters: album.filters,
      ),
    ),
  );

  if (newFilters != null) {
    await ref.read(albumServiceProvider).updateFilters(
      albumId: album.id,
      filters: newFilters,
    );
    // Refresh album
  }
}
```

**File**: `mobile/lib/modules/album/ui/dynamic_album_asset_grid.dart` (new file)

```dart
class DynamicAlbumAssetGrid extends ConsumerWidget {
  final Album album;

  const DynamicAlbumAssetGrid({required this.album});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Load assets based on filters
    // Show loading state
    // Render asset grid
    // Pull-to-refresh to recompute
  }
}
```

### 3.7 Sync Implementation

**File**: `mobile/lib/modules/album/services/album.service.dart` (modify existing)

```dart
Future<void> syncDynamicAlbums() async {
  // Fetch all albums from API
  final remoteAlbums = await _apiService.albumApi.getAllAlbums();

  for (final remoteAlbum in remoteAlbums) {
    if (remoteAlbum.dynamic) {
      // Store in Isar with filters as JSON
      final localAlbum = Album()
        ..remoteId = remoteAlbum.id
        ..albumName = remoteAlbum.albumName
        ..dynamic = true
        ..filtersJson = jsonEncode(remoteAlbum.filters);

      await _db.albums.put(localAlbum);
    }
  }
}

Future<List<Asset>> getAssetsForDynamicAlbum(Album album) async {
  // Option 1: Query local Isar database (offline-capable)
  // - Parse filters from JSON
  // - Apply filters to local assets
  // - Complex to implement all filter logic locally

  // Option 2: Fetch from API (requires network)
  // - Simpler implementation
  // - Always up-to-date
  // - Requires network connection

  // Recommended: Start with Option 2, add Option 1 later if needed
  if (album.filtersJson == null) return [];

  final filters = DynamicAlbumFilters.fromJson(
    jsonDecode(album.filtersJson!),
  );

  final result = await _apiService.albumApi.getAlbum(
    albumId: album.remoteId!,
  );

  return result.assets;
}
```

### 3.8 Mobile Testing

**File**: `mobile/test/modules/album/providers/dynamic_album_editor_test.dart` (new file)

Unit tests for editor provider.

**File**: `mobile/test/modules/album/services/album_service_test.dart` (enhance)

Test dynamic album sync and retrieval.

**File**: `mobile/test/modules/album/models/dynamic_album_filters_test.dart` (new file)

Test JSON serialization/deserialization.

Widget tests for UI components.

## Phase 4: Additional Features

### 4.1 Shared Links

**File**: `server/src/services/shared-link.service.ts` (modify if needed)

Ensure shared links work for dynamic albums:
- Public viewers see computed assets (real-time)
- Respect album permissions
- Test thoroughly

### 4.2 Download Support

**File**: `server/src/services/download.service.ts` (modify if needed)

Support downloading dynamic album assets:
- Fetch all matching assets
- Stream as ZIP
- Handle large albums (pagination)

### 4.3 Map View

**File**: `server/src/services/map.service.ts` (modify if needed)

Support map markers for dynamic albums:
- Filter assets with location data
- Apply dynamic album filters
- Return geotagged assets

### 4.4 Timeline View

**File**: `server/src/services/timeline.service.ts` (modify if needed)

Support timeline buckets for dynamic albums:
- Group assets by time period
- Apply filters
- Return bucketed results

## Phase 5: Testing & Quality

### 5.1 Unit Tests

**Backend** (target: 80%+ coverage):
- `dynamic-album.repository.spec.ts`: All repository methods
- `album.service.spec.ts`: Dynamic album CRUD operations
- `database.spec.ts`: Filter conversion and validation
- `dynamic-album.types.spec.ts`: Type guards and validation

**Web**:
- Component tests for all filter UI components
- Filter modal tests
- Album viewer tests

**Mobile**:
- Provider tests
- Service tests
- Model tests
- Widget tests

### 5.2 Integration Tests

**Backend**:
```typescript
describe('Dynamic Albums Integration', () => {
  it('should create dynamic album and fetch computed assets', async () => {
    // Create assets with tags
    // Create dynamic album with tag filter
    // Fetch album
    // Verify correct assets returned
  });

  it('should update when assets change', async () => {
    // Create dynamic album
    // Add new asset matching filter
    // Refetch album
    // Verify new asset appears
  });

  it('should respect AND operator', async () => {
    // Create album with multiple tags, operator=AND
    // Verify only assets with ALL tags appear
  });
});
```

### 5.3 E2E Tests

**Web** (`e2e/web/dynamic-albums.spec.ts`):
- Create dynamic album end-to-end
- Edit filters
- View assets
- Share dynamic album
- Quick actions (create from tag/person)

**Mobile** (if infrastructure exists):
- Create dynamic album
- View album
- Edit filters
- Sync

### 5.4 Performance Tests

**Scenarios**:
1. Query 10k assets with simple filter
2. Query 10k assets with complex filter (multiple criteria)
3. Calculate metadata for 10k asset album
4. Concurrent requests (10 users querying dynamic albums)

**Benchmarks**:
- Query time: < 1 second
- Metadata calculation: < 2 seconds
- Preview: < 500ms

**Tools**:
- Use query EXPLAIN ANALYZE
- Monitor with application metrics
- Load testing with k6 or similar

### 5.5 Code Quality

**Checklist**:
- [ ] All console.log replaced with proper logger
- [ ] No commented-out code
- [ ] JSDoc comments for public APIs
- [ ] TypeScript strict mode compliance
- [ ] Error handling consistent
- [ ] No dead code
- [ ] Imports organized

**Run linters**:
```bash
make check-server
make check-web
cd mobile && dart analyze
```

## Phase 6: Documentation

### 6.1 User Documentation

Create guides in `docs/` (or in-app help):

1. **What are Dynamic Albums?**
   - Concept explanation
   - Use cases
   - Static vs dynamic comparison

2. **Creating Dynamic Albums**
   - Step-by-step guide
   - Screenshots
   - Video tutorial (optional)

3. **Filter Types Guide**
   - Tags filter
   - People filter
   - Location filter
   - Date range filter
   - Metadata filters

4. **AND vs OR Operators**
   - Clear explanation with examples
   - When to use each

5. **FAQ**
   - Can I add assets manually? (No)
   - Can I convert static to dynamic? (Yes, with warning)
   - Do dynamic albums sync to mobile? (Yes)
   - What happens when I delete a tag used in filter? (Discuss)

### 6.2 Developer Documentation

**API Documentation**:
- Update OpenAPI descriptions
- Add examples for each endpoint
- Document filter structure

**Code Documentation**:
```typescript
/**
 * Get assets matching dynamic album filters
 *
 * @param filters - Dynamic album filter criteria
 * @param ownerId - Owner user ID for access control
 * @param options - Pagination and sorting options
 * @returns Paginated asset results
 *
 * @example
 * ```typescript
 * const result = await getAssets(
 *   { tags: ['tag-id-1'], operator: 'and' },
 *   'user-id',
 *   { page: 1, size: 100 }
 * );
 * ```
 */
async getAssets(
  filters: DynamicAlbumFilters,
  ownerId: string,
  options?: SearchOptions
): Promise<AssetResult>
```

**Architecture Documentation**:
- Data flow diagram
- Filter conversion process
- Caching strategy
- Performance considerations

### 6.3 Translations

**File**: `i18n/en.json` (and other locales)

Add translations:
```json
{
  "dynamic_album": "Dynamic Album",
  "create_dynamic_album": "Create Dynamic Album",
  "edit_filters": "Edit Filters",
  "configure_filters": "Configure Filters",
  "filter_tags": "Tags",
  "filter_people": "People",
  "filter_location": "Location",
  "filter_date_range": "Date Range",
  "filter_asset_type": "Asset Type",
  "filter_metadata": "Metadata",
  "operator_and": "All (AND)",
  "operator_or": "Any (OR)",
  "operator_and_description": "Assets must match ALL selected criteria",
  "operator_or_description": "Assets can match ANY selected criteria",
  "preview_count": "{count} assets match",
  "dynamic_album_created": "Dynamic album '{album}' created",
  "errors.invalid_filters": "Invalid filter configuration",
  "errors.no_filters": "At least one filter is required",
  // ... more translations
}
```

## Success Criteria

### Functional Requirements
- ✅ Users can create dynamic albums with all filter types
- ✅ Users can edit filters after album creation
- ✅ Assets automatically appear/disappear based on criteria
- ✅ AND/OR operators work correctly
- ✅ Shared links work for dynamic albums
- ✅ Mobile apps fully support dynamic albums
- ✅ Download, map, timeline views work

### Performance Requirements
- ✅ Asset query < 1s for 10k assets
- ✅ Metadata calculation < 2s for 10k assets
- ✅ Filter preview < 500ms
- ✅ No UI blocking during operations

### Quality Requirements
- ✅ 80%+ code coverage for new code
- ✅ Zero critical bugs
- ✅ All E2E tests passing
- ✅ Linters passing
- ✅ WCAG 2.1 AA accessible (web)

### User Experience
- ✅ Intuitive filter builder
- ✅ Clear error messages
- ✅ Helpful tooltips
- ✅ Responsive on all devices
- ✅ Documentation available

## Implementation Checklist

### Backend
- [ ] Create type definitions (`dynamic-album.types.ts`)
- [ ] Implement validation and sanitization
- [ ] Create database migration
- [ ] Extend album schema
- [ ] Create `DynamicAlbumRepository`
- [ ] Enhance search integration (AND/OR for tags, other filters)
- [ ] Update `AlbumService` (getAll, get, create, update)
- [ ] Add preview and validate endpoints
- [ ] Update DTOs
- [ ] Generate OpenAPI spec and SDKs
- [ ] Write unit tests (80%+ coverage)
- [ ] Write integration tests
- [ ] Test shared links, download, map, timeline

### Web Frontend
- [ ] Create `TagSelector` component
- [ ] Create `PeopleSelector` component
- [ ] Create `LocationFilter` component
- [ ] Create `DateRangePicker` component
- [ ] Create `MetadataFilter` component
- [ ] Create `FilterOperatorSelector` component
- [ ] Create `DynamicAlbumFiltersModal`
- [ ] Update `CreateAlbumModal`
- [ ] Update album viewer with edit filters
- [ ] Create `FilterDisplay` component
- [ ] Add quick actions (tags/people pages)
- [ ] Write E2E tests

### Mobile
- [ ] Extend Isar schema
- [ ] Create filter models with JSON serialization
- [ ] Create `DynamicAlbumEditor` provider
- [ ] Create filter UI widgets
- [ ] Update album creation flow
- [ ] Update album viewer
- [ ] Implement sync
- [ ] Write unit tests
- [ ] Write widget tests

### Documentation
- [ ] User guides (what, how, FAQ)
- [ ] API documentation
- [ ] Code documentation (JSDoc)
- [ ] Architecture docs
- [ ] Translations

### Quality
- [ ] All tests passing
- [ ] Code review
- [ ] Performance benchmarks met
- [ ] Linters passing
- [ ] No security issues
- [ ] Accessibility verified

## Timeline Estimate

- **Phase 1 (Backend)**: 2-3 weeks
- **Phase 2 (Web)**: 2-3 weeks
- **Phase 3 (Mobile)**: 3-4 weeks
- **Phase 4 (Additional Features)**: 1 week
- **Phase 5 (Testing)**: 2 weeks (parallel with other phases)
- **Phase 6 (Documentation)**: 1 week (parallel)

**Total**: 10-14 weeks (2.5-3.5 months)

## Notes for Implementer

- Start with backend foundation - it's critical
- Test each component thoroughly before moving on
- Keep performance in mind - monitor query times
- Use existing patterns from codebase (see CLAUDE.md)
- Don't skip testing - write tests alongside code
- Document as you go
- Ask for clarification if specs are unclear
- Regular commits with descriptive messages

## References

- **Codebase Patterns**: `/Users/opac/dev/immich/immich/CLAUDE.md`
- **Search Infrastructure**: `server/src/repositories/search.repository.ts`
- **Album Service**: `server/src/services/album.service.ts`
- **Kysely Docs**: https://kysely.dev/
- **Svelte 5 Runes**: https://svelte.dev/docs/runes
- **Riverpod**: https://riverpod.dev/
