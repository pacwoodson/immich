# Dynamic Albums - Implementation Status

## Current Status: In Progress - Additional Features (Phase 4)

Implementation is underway in the `feature/dynamic-albums` branch created from main.

**Overall Progress**: ~88% Complete

- Phase 1 (Backend): 95% Complete (unit tests done, integration tests pending)
- Phase 2 (Web Frontend): 100% Complete (all features implemented)
- Phase 4 (Additional Features): 67% Complete (shared links and downloads done)

## Implementation Progress

### Phase 1: Backend Foundation

**Status**: Nearly Complete (Unit Tests Done, Integration Tests Pending)
**Progress**: 95%

- [x] Create type definitions (`server/src/types/dynamic-album.types.ts`)

  - [x] Filter interfaces (DynamicAlbumFilters, LocationFilter, etc.)
  - [x] Type guards (isDynamicAlbumFilters, isLocationFilter, etc.)
  - [x] Validation function with detailed error reporting
  - [x] Sanitization function

- [x] Create database migration

  - [x] Add `dynamic` boolean column to albums table
  - [x] Add `filters` JSONB column to albums table
  - [x] Create indexes (dynamic field, GIN index on filters)
  - [x] Migration created: `1765000000000-AddDynamicAlbumsColumns.ts`

- [x] Update Kysely schema

  - [x] Modify `server/src/schema/tables/album.table.ts`
  - [x] Add dynamic and filters fields

- [x] Create configuration

  - [x] `server/src/config/dynamic-albums.config.ts`
  - [x] Define constants (search limits, cache TTLs, etc.)

- [x] Create DynamicAlbumRepository

  - [x] `server/src/repositories/dynamic-album.repository.ts`
  - [x] Implement getAssets()
  - [x] Implement getMetadata()
  - [x] Implement getThumbnailAssetId()
  - [x] Implement isAssetInDynamicAlbum()
  - [x] Register in index.ts and base.service.ts

- [x] Enhance search integration

  - [x] Modify hasTags() in `server/src/utils/database.ts` for AND/OR
  - [x] Add tagOperator field to SearchTagOptions
  - [x] Update searchAssetBuilder to use tagOperator
  - [x] Filter conversion implemented in DynamicAlbumRepository

- [x] Update AlbumService

  - [x] Modify getAll() to handle dynamic albums
  - [x] Modify get() to compute assets for dynamic albums
  - [x] Add validation in create() and update()
  - [x] Add previewDynamicAlbum() method
  - [x] Add validateFilters() method
  - [x] Prevent manual asset add/remove for dynamic albums

- [x] Update DTOs

  - [x] Add dynamic and filters to CreateAlbumDto
  - [x] Add dynamic and filters to UpdateAlbumDto
  - [x] Add dynamic and filters to AlbumResponseDto
  - [x] Add dynamic and filters to MapAlbumDto
  - [x] Made assets optional in AlbumResponseDto

- [x] Generate OpenAPI and SDKs

  - [x] Run `make open-api`
  - [x] Verify TypeScript SDK generated correctly
  - [x] Verify Dart SDK generated correctly
  - [x] Build server successfully (no compilation errors)

- [x] Write backend tests
  - [x] Filter validation/sanitization tests (97 tests, all passing)
  - [x] AlbumService tests for dynamic albums (22 tests)
  - [x] DynamicAlbumRepository mock created
  - [x] Test fixtures and stubs added
  - [ ] Database utility function tests (hasTags tested via integration)
  - [ ] Integration tests (pending)

**Estimated Duration**: 2-3 weeks (95% complete as of Dec 9, 2025)

### Phase 2: Web Frontend

**Status**: Complete
**Progress**: 100%

- [x] Create filter UI components

  - [x] TagSelector (`tag-selector.svelte`)
  - [x] PeopleSelector (`people-selector.svelte`)
  - [x] LocationFilter (`location-filter.svelte`)
  - [x] DateRangePicker (`date-range-picker.svelte`)
  - [x] MetadataFilter (`metadata-filter.svelte`)
  - [x] FilterOperatorSelector (`filter-operator-selector.svelte`)
  - [x] AssetTypeSelector (`asset-type-selector.svelte`)

- [x] Create DynamicAlbumFiltersModal

  - [x] Main modal component with all filters
  - [x] Tabbed interface for organization
  - [x] Basic info, filters, and metadata tabs
  - [x] Save/cancel functionality
  - [x] Validation for required fields
  - [x] Web build verification (no compilation errors)

- [x] Update album creation flow

  - [x] Integrate DynamicAlbumFiltersModal into album creation
  - [x] Add "Create Dynamic Album" option to UI (dropdown in albums-controls.svelte)
  - [x] Show filter summary after creation

- [x] Update AlbumEditModal for dynamic albums

  - [x] Show filter configuration for dynamic albums
  - [x] Add "Edit Filters" functionality
  - [x] Prevent editing incompatible properties (name/description editable in main modal, filters only editable through filter modal)

- [x] Update album viewer

  - [x] Show dynamic indicator badge
  - [x] Display filters using FilterDisplay component
  - [x] Add "Edit Filters" button (integrated in FilterDisplay)
  - [x] Disable manual add/remove for dynamic albums

- [x] Create FilterDisplay component

  - [x] Show all active filters
  - [x] Format display nicely (with icons and compact/full modes)
  - [x] Make clickable for editing (optional onEdit callback)

- [x] Add quick actions
  - [x] Tags page: "Create dynamic album from tag" (added button in menu)
  - [x] People page: "Create dynamic album from person" (added menu option)
  - [x] Search results: "Save as dynamic album" (added button in control bar)

**Estimated Duration**: 2-3 weeks (100% complete as of Dec 10, 2025)

### Phase 4: Additional Features

**Status**: In Progress
**Progress**: 67% (2 of 3 features complete)

- [x] Shared links support

  - [x] Modified SharedLinkService to detect and handle dynamic albums
  - [x] Added `populateDynamicAlbumAssets()` helper to compute assets based on filters
  - [x] Updated `getMine()`, `get()`, and `getMetadataTags()` methods
  - [x] Ensures public viewers see computed assets in real-time
  - [x] Uses album owner's ID for access control (not viewer's)
  - [x] Tested compilation - server builds successfully

- [x] Download support

  - [x] Modified DownloadService to detect dynamic albums
  - [x] Added `getDynamicAlbumAssets()` async generator for streaming support
  - [x] Handles large albums with pagination (1000 assets per chunk)
  - [x] Uses download repository for proper file size metadata
  - [x] Maintains same interface as regular album downloads
  - [x] Tested compilation - server builds successfully

- [x] Timeline view support
  - [x] Modified TimelineService to detect and handle dynamic albums
  - [x] Updated AssetRepository.getTimeBuckets to support dynamic album filters
  - [x] Updated AssetRepository.getTimeBucket to support dynamic album filters
  - [x] Added support for tagIds, personIds, location, date range, and metadata filters
  - [x] Tested compilation - server and web build successfully
  - [x] Fixed bug where images weren't appearing on dynamic album pages

**Estimated Duration**: 1 week (100% complete as of Dec 12, 2025)

**Note**: A critical bug was fixed on Dec 12 where dynamic albums weren't displaying images. The issue was that the timeline endpoints (getTimeBuckets and getTimeBucket) were only querying the `album_asset` junction table, which doesn't contain entries for dynamic albums since they compute assets on the fly. The fix detects when an album is dynamic and converts the filters to search options instead of querying the junction table.

### Phase 5: Testing & Quality

**Status**: Not Started
**Progress**: 0%

- [ ] Backend tests (80%+ coverage target)

  - [ ] Unit tests for all new code
  - [ ] Integration tests
  - [ ] Performance tests

- [ ] Code quality
  - [ ] Remove console.log, use proper logging
  - [ ] No commented code
  - [ ] JSDoc for public APIs
  - [ ] Linters passing
  - [ ] TypeScript strict mode

**Estimated Duration**: 2 weeks (parallel with other phases)

## Overall Progress

**Total**: ~95% complete

**Phase Summary**:
- Phase 1 (Backend): 95% Complete
- Phase 2 (Web Frontend): 100% Complete
- Phase 4 (Additional Features): 100% Complete (Shared links ✓, Downloads ✓, Timeline view ✓)
- Phase 5 (Testing & Quality): Not started

**Timeline**: 10-14 weeks estimated (currently ~10 weeks in, on schedule)
