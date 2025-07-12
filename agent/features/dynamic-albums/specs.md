# Enhanced Albums with Dynamic Filtering - Refactored Specifications

## What is Enhanced Albums?

Enhanced Albums refactors the existing album system to support both regular albums (manual asset management) and dynamic albums (automatic asset filtering) within the same table and UI structure. This is not a separate feature but an enhancement to the existing album functionality.

Instead of having separate dynamic album tables, we add a `dynamic` boolean field to the existing `albums` table. When `dynamic=true`, the album automatically populates with assets based on filter criteria instead of manual asset selection.

## Why This Refactoring?

### Current Implementation Issues
- **Duplicate Code**: Separate dynamic album tables, controllers, services, and frontend components
- **Inconsistent UI**: Different interfaces for regular vs dynamic albums
- **Maintenance Overhead**: Two separate systems to maintain
- **User Confusion**: Users must learn two different album systems

### Refactored Solution
- **Unified System**: Single album table with dynamic capability
- **Consistent UI**: Same interface for all album types
- **Simplified Architecture**: One set of components handles both types
- **Better User Experience**: Seamless transition between album types

## Database Schema Changes

### Enhanced AlbumTable
```typescript
@Table({ name: 'albums', primaryConstraintName: 'PK_7f71c7b5bc7c87b8f94c9a93a00' })
export class AlbumTable {
  // ... existing fields ...
  
  @Column({ type: 'boolean', default: false })
  dynamic!: Generated<boolean>;
  
  @Column({ type: 'jsonb', nullable: true })
  filters!: object | null;
}
```

### Filter Structure
```typescript
interface AlbumFilter {
  type: 'tags' | 'people' | 'location' | 'date' | 'asset_type' | 'favorite';
  operator: 'and' | 'or' | 'not';
  value: string | string[] | { from: string; to: string } | boolean;
}
```

## Backend Changes

### Enhanced AlbumService
- **Dynamic Album Logic**: When `album.dynamic = true`, disable asset add/remove operations
- **Filter Processing**: Apply filters to fetch assets dynamically
- **Unified API**: Same endpoints serve both regular and dynamic albums
- **Asset Fetching**: Use filters to query assets instead of album_assets table

### Enhanced AlbumRepository
- **Filter Query Building**: Convert filter objects to SQL WHERE clauses
- **Dynamic Asset Retrieval**: Query assets based on filters for dynamic albums
- **Unified Metadata**: Calculate counts and dates for both album types

### API Endpoints (Enhanced)
- `GET /api/albums` - Returns both regular and dynamic albums
- `POST /api/albums` - Creates regular or dynamic albums based on `dynamic` field
- `GET /api/albums/:id` - Returns album with assets (filtered or stored)
- `PATCH /api/albums/:id` - Updates album (including filters for dynamic albums)
- `POST /api/albums/:id/assets` - Disabled for dynamic albums
- `DELETE /api/albums/:id/assets` - Disabled for dynamic albums

## Frontend Changes

### Enhanced Album Components
- **AlbumCard**: Display regular and dynamic albums with visual indicators
- **AlbumPage**: Show assets from storage or filters based on album type
- **AlbumEditModal**: Edit album name/description and filters for dynamic albums
- **AlbumCreateModal**: Create regular or dynamic albums with toggle option

### UI/UX Enhancements
- **Dynamic Indicator**: Visual badge showing "Dynamic" for filtered albums
- **Filter Display**: Show active filters in album header
- **Disabled Actions**: Grey out add/remove buttons for dynamic albums
- **Filter Management**: Inline editing of filters for dynamic albums

### Route Integration
- `/albums` - Shows all albums (regular and dynamic)
- `/albums/:id` - Shows album assets (stored or filtered)
- Same navigation and sharing for both types

## Migration Strategy

### Database Migration
1. Add `dynamic` boolean field to `albums` table
2. Add `filters` JSONB field to `albums` table
3. Migrate existing dynamic album data to enhanced albums table
4. Drop all separate dynamic album tables

### Code Migration
1. Remove all dynamic album controllers, services, repositories
2. Remove all dynamic album frontend components and routes
3. Enhance existing album components with dynamic functionality
4. Update existing album service with filter logic

## Implementation Details

### Filter Processing
```typescript
// Example filter processing in AlbumService
async getAssets(albumId: string): Promise<Asset[]> {
  const album = await this.albumRepository.getById(albumId);
  
  if (album.dynamic) {
    // Use filters to query assets
    return this.assetRepository.getByFilters(album.filters);
  } else {
    // Use album_assets table
    return this.albumRepository.getAssets(albumId);
  }
}
```

### Frontend Integration
```typescript
// Enhanced album card component
<AlbumCard>
  {#if album.dynamic}
    <div class="dynamic-badge">Dynamic</div>
    <FilterDisplay filters={album.filters} />
  {/if}
  
  <!-- Common album content -->
  <AlbumCover />
  <AlbumTitle />
  <AlbumStats />
</AlbumCard>
```

## User Experience

### Creating Albums
1. **Album Type Selection**: Toggle between "Regular" and "Dynamic" during creation
2. **Filter Setup**: For dynamic albums, set up filters instead of adding assets
3. **Preview**: Show asset count and sample assets based on filters

### Managing Albums
1. **Visual Distinction**: Dynamic albums show filter badges and asset counts
2. **Disabled Operations**: Add/remove asset buttons disabled for dynamic albums
3. **Filter Editing**: Edit filters directly in album settings
4. **Conversion**: Allow converting regular albums to dynamic (with confirmation)

### Sharing and Access
1. **Unified Sharing**: Same sharing interface for both album types
2. **Link Sharing**: Same shared link system for both types
3. **Access Control**: Same permission system for both types

## Technical Benefits

### Simplified Architecture
- **Single Table**: One albums table instead of multiple
- **Unified Controllers**: One set of API endpoints
- **Consistent Components**: Same UI components for both types
- **Reduced Complexity**: Less code to maintain

### Better Performance
- **Efficient Queries**: Direct asset filtering instead of separate table joins
- **Unified Caching**: Same caching strategy for both types
- **Reduced Database Load**: Fewer tables and relationships

### Enhanced Maintainability
- **Single Source of Truth**: All album logic in one place
- **Consistent Patterns**: Same architectural patterns throughout
- **Easier Testing**: Unified test suite for album functionality

## Migration Safety

### Backward Compatibility
- **Existing Albums**: All existing albums remain unchanged (`dynamic = false`)
- **API Compatibility**: All existing API endpoints continue to work
- **Data Integrity**: All existing album data preserved during migration

### Rollback Strategy
- **Database Rollback**: Migration can be reversed if needed
- **Feature Toggle**: Dynamic functionality can be disabled via config
- **Data Recovery**: Original dynamic album data backed up during migration

## Success Metrics

### Technical Metrics
- **Code Reduction**: 50% reduction in album-related code
- **Database Efficiency**: Fewer tables and simpler queries
- **Performance**: Faster album loading and filtering

### User Experience Metrics
- **Unified Interface**: Single interface for all album types
- **Reduced Learning Curve**: Users only need to learn one system
- **Feature Adoption**: Higher usage of dynamic filtering due to integration

This refactored approach provides a more maintainable, user-friendly, and efficient solution for dynamic album functionality while preserving all existing album capabilities.
