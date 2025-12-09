# Dynamic Albums - Implementation Status

## Current Status: In Progress - Backend Foundation (Phase 1)

Implementation is underway in the `feature/dynamic-albums` branch created from main.

## Implementation Progress

### Phase 1: Backend Foundation
**Status**: In Progress
**Progress**: 50%

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

- [ ] Update AlbumService
  - [ ] Modify getAll() to handle dynamic albums
  - [ ] Modify get() to compute assets for dynamic albums
  - [ ] Add validation in create() and update()
  - [ ] Add previewDynamicAlbum() method
  - [ ] Add validateFilters() method

- [ ] Update DTOs
  - [ ] Add dynamic and filters to CreateAlbumDto
  - [ ] Add dynamic and filters to UpdateAlbumDto
  - [ ] Update validation decorators

- [ ] Generate OpenAPI and SDKs
  - [ ] Run `make open-api`
  - [ ] Verify TypeScript SDK generated correctly
  - [ ] Verify Dart SDK generated correctly

- [ ] Write backend tests
  - [ ] DynamicAlbumRepository unit tests
  - [ ] Filter validation/sanitization tests
  - [ ] AlbumService tests for dynamic albums
  - [ ] Database utility function tests
  - [ ] Integration tests

**Estimated Duration**: 2-3 weeks

### Phase 2: Web Frontend
**Status**: Not Started
**Progress**: 0%

- [ ] Create filter UI components
  - [ ] TagSelector (`tag-selector.svelte`)
  - [ ] PeopleSelector (`people-selector.svelte`)
  - [ ] LocationFilter (`location-filter.svelte`)
  - [ ] DateRangePicker (`date-range-picker.svelte`)
  - [ ] MetadataFilter (`metadata-filter.svelte`)
  - [ ] FilterOperatorSelector (`filter-operator-selector.svelte`)

- [ ] Create DynamicAlbumFiltersModal
  - [ ] Main modal component with all filters
  - [ ] Real-time preview with asset count
  - [ ] Debounced filter updates
  - [ ] Save/cancel functionality

- [ ] Update CreateAlbumModal
  - [ ] Add "Dynamic Album" toggle
  - [ ] Integrate filter configuration
  - [ ] Show filter summary
  - [ ] Validation

- [ ] Update album viewer
  - [ ] Show dynamic indicator badge
  - [ ] Display filters using FilterDisplay component
  - [ ] Add "Edit Filters" button
  - [ ] Disable manual add/remove for dynamic albums

- [ ] Create FilterDisplay component
  - [ ] Show all active filters
  - [ ] Format display nicely
  - [ ] Make clickable for editing

- [ ] Add quick actions
  - [ ] Tags page: "Create dynamic album from tag"
  - [ ] People page: "Create dynamic album from person"
  - [ ] Search results: "Save as dynamic album"

- [ ] Write web E2E tests
  - [ ] Create dynamic album test
  - [ ] Edit filters test
  - [ ] Preview test
  - [ ] Quick actions test

**Estimated Duration**: 2-3 weeks

### Phase 3: Mobile Implementation
**Status**: Not Started
**Progress**: 0%

- [ ] Extend Isar schema
  - [ ] Add dynamic field to Album model
  - [ ] Add filtersJson field to Album model

- [ ] Create filter models
  - [ ] DynamicAlbumFilters class
  - [ ] LocationFilter, DateRangeFilter, MetadataFilter classes
  - [ ] JSON serialization/deserialization

- [ ] Create DynamicAlbumEditor provider
  - [ ] Riverpod provider for filter state
  - [ ] Methods to update each filter type
  - [ ] Preview functionality
  - [ ] Save functionality

- [ ] Create filter UI widgets
  - [ ] TagSelectorWidget
  - [ ] PeopleSelectorWidget
  - [ ] LocationFilterWidget
  - [ ] DateRangePickerWidget
  - [ ] MetadataFilterWidget
  - [ ] OperatorSelector

- [ ] Create DynamicAlbumFilterEditor screen
  - [ ] Main editor UI
  - [ ] Preview bar at bottom
  - [ ] Save/cancel

- [ ] Update album creation flow
  - [ ] Add dynamic album toggle
  - [ ] Navigate to filter editor
  - [ ] Create album with filters

- [ ] Update album viewer
  - [ ] Show dynamic indicator
  - [ ] Display filters
  - [ ] Edit filters button
  - [ ] DynamicAlbumAssetGrid component

- [ ] Implement sync
  - [ ] Sync dynamic albums from API
  - [ ] Store filters as JSON in Isar
  - [ ] Fetch assets for dynamic albums

- [ ] Write mobile tests
  - [ ] Provider unit tests
  - [ ] Service tests
  - [ ] Model tests (JSON serialization)
  - [ ] Widget tests

**Estimated Duration**: 3-4 weeks

### Phase 4: Additional Features
**Status**: Not Started
**Progress**: 0%

- [ ] Shared links support
  - [ ] Test shared links for dynamic albums
  - [ ] Ensure public viewing works
  - [ ] Fix any issues

- [ ] Download support
  - [ ] Support downloading dynamic album assets
  - [ ] Handle large albums with pagination

- [ ] Map view support
  - [ ] Filter geotagged assets from dynamic albums
  - [ ] Return map markers

- [ ] Timeline view support
  - [ ] Support timeline buckets for dynamic albums
  - [ ] Group assets by time period with filters applied

**Estimated Duration**: 1 week

### Phase 5: Testing & Quality
**Status**: Not Started
**Progress**: 0%

- [ ] Backend tests (80%+ coverage target)
  - [ ] Unit tests for all new code
  - [ ] Integration tests
  - [ ] Performance tests

- [ ] Web tests
  - [ ] Component tests
  - [ ] E2E tests with Playwright

- [ ] Mobile tests
  - [ ] Unit tests
  - [ ] Widget tests
  - [ ] Integration tests (if infrastructure available)

- [ ] Performance benchmarks
  - [ ] Query 10k assets < 1s
  - [ ] Metadata calculation < 2s
  - [ ] Preview < 500ms
  - [ ] Load testing

- [ ] Code quality
  - [ ] Remove console.log, use proper logging
  - [ ] No commented code
  - [ ] JSDoc for public APIs
  - [ ] Linters passing
  - [ ] TypeScript strict mode

**Estimated Duration**: 2 weeks (parallel with other phases)

### Phase 6: Documentation
**Status**: Not Started
**Progress**: 0%

- [ ] User documentation
  - [ ] What are Dynamic Albums guide
  - [ ] How to create guide with screenshots
  - [ ] Filter types guide
  - [ ] AND vs OR explanation
  - [ ] FAQ

- [ ] Developer documentation
  - [ ] API documentation with examples
  - [ ] Code documentation (JSDoc)
  - [ ] Architecture documentation

- [ ] Translations
  - [ ] Add all strings to i18n/en.json
  - [ ] Request translations for other locales

**Estimated Duration**: 1 week (parallel with other phases)

## Overall Progress

**Total**: 0% complete

**Timeline**: 10-14 weeks (2.5-3.5 months) estimated

## Next Steps for Implementer

### 1. Setup
```bash
# Create worktree from main branch
git worktree add ../immich-dynamic-albums main
cd ../immich-dynamic-albums
git checkout -b feature/dynamic-albums
```

### 2. Start with Phase 1: Backend Foundation

Begin in this order:

1. **Create type definitions first** - This provides the foundation
   - File: `server/src/types/dynamic-album.types.ts`
   - Implement all interfaces, type guards, validation, sanitization
   - Write unit tests as you go

2. **Create database migration** - Schema changes needed early
   - File: `server/src/migrations/YYYYMMDDHHMMSS-DynamicAlbums.ts`
   - Test migration up and down
   - Update Kysely schema in album.table.ts

3. **Create configuration** - Simple but needed by repository
   - File: `server/src/config/dynamic-albums.config.ts`

4. **Build DynamicAlbumRepository** - Core querying logic
   - File: `server/src/repositories/dynamic-album.repository.ts`
   - Implement all methods
   - Register in module

5. **Enhance search integration** - Enable filter conversion
   - Modify `server/src/utils/database.ts`
   - Add AND/OR support to hasTags()
   - Create filter conversion utility

6. **Update AlbumService** - Integrate with existing album logic
   - Modify getAll(), get(), create(), update()
   - Add preview and validation methods

7. **Update DTOs and generate SDKs**
   - Modify album DTOs
   - Run `make open-api`

8. **Write comprehensive tests** - Don't skip!
   - Unit tests (80%+ coverage target)
   - Integration tests
   - Test all filter combinations

### 3. Move to Phase 2: Web Frontend

After backend is stable and tested:

1. Start with individual filter components (tag selector, people selector, etc.)
2. Build the comprehensive filter modal
3. Update create album modal
4. Enhance album viewer
5. Add quick actions
6. Write E2E tests

### 4. Then Phase 3: Mobile Implementation

1. Extend models and schema
2. Create providers
3. Build UI widgets
4. Update flows
5. Implement sync
6. Write tests

### 5. Phases 4-6: Additional features, testing, documentation

Work on these in parallel where possible.

## Development Guidelines

### Code Organization
- Follow existing Immich patterns (see `/Users/opac/dev/immich/immich/CLAUDE.md`)
- Use existing infrastructure (SearchRepository, AlbumRepository, etc.)
- Don't duplicate code - reuse where possible

### Testing
- **Write tests alongside implementation** - not after
- Target 80%+ coverage for new code
- Test edge cases and error conditions
- Write integration tests for critical paths

### Performance
- Monitor query times during development
- Use EXPLAIN ANALYZE to optimize queries
- Implement caching where beneficial
- Consider pagination for large result sets

### Git Workflow
- Make regular commits with descriptive messages
- Commit after each logical chunk of work
- Push to feature branch regularly
- Don't commit agent memory files (.claude, ./agent folders)

### Communication
- Update status.md as you complete major tasks
- Note any blockers or issues
- Ask questions if specs are unclear
- Document any deviations from specs

## Success Metrics

### Must Have (MVP)
- [ ] Create dynamic album with at least tags filter
- [ ] View dynamic album with computed assets
- [ ] Edit filters on existing album
- [ ] Assets update automatically when filters/data changes
- [ ] Basic tests passing
- [ ] Web UI complete

### Should Have
- [ ] All filter types implemented (tags, people, location, date, metadata)
- [ ] AND/OR operators working
- [ ] Mobile support complete
- [ ] Shared links working
- [ ] 80%+ test coverage
- [ ] Performance benchmarks met

### Nice to Have
- [ ] Download, map, timeline views
- [ ] Quick actions everywhere
- [ ] Comprehensive documentation
- [ ] All translations

## Known Challenges

### Technical Challenges

1. **Search Integration**
   - Challenge: Existing search may not support all filter types
   - Solution: Extend SearchOptions and searchMetadata() incrementally
   - Test each filter type thoroughly

2. **Performance with Large Albums**
   - Challenge: Loading 10k+ assets could be slow
   - Solution: Implement pagination, caching, consider background jobs
   - Monitor and optimize early

3. **Mobile Offline Support**
   - Challenge: Computing filters locally is complex
   - Solution: Start with API-based approach, add local filtering later if needed

4. **Filter Validation**
   - Challenge: Complex validation rules, edge cases
   - Solution: Comprehensive type guards and unit tests
   - Sanitize inputs aggressively

### Process Challenges

1. **Full-stack Complexity**
   - Challenge: Backend, web, mobile all need implementation
   - Solution: Complete each layer fully before moving to next
   - Test integration between layers

2. **Testing Coverage**
   - Challenge: Large feature, many test cases
   - Solution: Write tests alongside code, not after
   - Use test-driven development where appropriate

3. **Migration Risk**
   - Challenge: Schema changes can be risky
   - Solution: Test migration thoroughly
   - Ensure backward compatibility (dynamic=false by default)

## Resources

### Documentation
- Feature description: `description.md`
- Implementation specs: `specs.md` (this file's sibling)
- Codebase patterns: `/Users/opac/dev/immich/immich/CLAUDE.md`
- Agent instructions: `/Users/opac/dev/immich/immich/agent/claude.md`

### Key Files to Reference
- Album service: `server/src/services/album.service.ts`
- Album repository: `server/src/repositories/album.repository.ts`
- Search repository: `server/src/repositories/search.repository.ts`
- Database utils: `server/src/utils/database.ts`
- Album schema: `server/src/schema/tables/album.table.ts`

### External Resources
- Kysely documentation: https://kysely.dev/
- Svelte 5 runes: https://svelte.dev/docs/runes
- Riverpod: https://riverpod.dev/
- NestJS: https://nestjs.com/
- Immich docs: https://immich.app/docs

## Notes

- This is a **new implementation from scratch** - no existing code to reference
- Start from the **main branch**, not agent-base
- Create feature branch: `feature/dynamic-albums`
- **Do not** include agent memory files (./agent, .claude) in the feature branch
- Follow the phased approach - don't skip ahead
- Testing is critical - allocate sufficient time
- Performance matters - monitor early and often
- Ask questions if anything is unclear

## Risk Assessment

### Low Risk
- Database schema changes (backward compatible with defaults)
- Type system implementation (well-specified)
- Basic filter functionality (tags, people)

### Medium Risk
- Search integration complexity
- Performance with large datasets
- Mobile sync implementation
- Testing coverage and quality

### High Risk
- None identified - specs are clear and approach is sound

## Timeline by Phase

| Phase | Description | Duration | Dependencies |
|-------|-------------|----------|--------------|
| 1 | Backend Foundation | 2-3 weeks | None |
| 2 | Web Frontend | 2-3 weeks | Phase 1 complete |
| 3 | Mobile | 3-4 weeks | Phase 1 complete |
| 4 | Additional Features | 1 week | Phases 1-3 |
| 5 | Testing & Quality | 2 weeks | Parallel with all |
| 6 | Documentation | 1 week | Parallel with all |

**Total: 10-14 weeks** with parallelization

## Questions for Product Owner

Before starting implementation, consider clarifying:

1. **Operator Scope**: Should the AND/OR operator apply globally to all filters, or should each filter type have its own operator?
   - Recommendation: Start with global operator for simplicity

2. **Filter Limits**: Should there be a maximum number of filters per album?
   - Recommendation: No hard limit, but warn if query might be slow (10+ filters)

3. **Static to Dynamic Conversion**: Should users be able to convert static albums to dynamic?
   - Recommendation: Yes, but warn about losing manual asset associations

4. **Mobile Priority**: Should mobile be included in MVP or added later?
   - Recommendation: Include in MVP for feature parity

5. **Performance vs Features**: If performance is an issue, should we reduce filter types or optimize queries?
   - Recommendation: Optimize queries first, all filter types are valuable

## Last Updated

- **Date**: 2025-12-08
- **Updated by**: Planning Agent
- **Status**: Ready for Implementation
- **Next Step**: Implementer agent should create feature branch and begin Phase 1
