# Dynamic Albums Technical Specification

## Overview

Dynamic Albums is a completely new and independent system that allows users to create automatically populated collections of assets based on configurable filters. This system is entirely separate from the existing album system and does not modify or extend any existing album functionality.

**Key Principle**: Dynamic Albums is a new feature that coexists alongside the existing album system, not an extension of it.

## Core Concept

Dynamic Albums is a separate system from traditional albums with these characteristics:
- **Independent System**: Completely separate database tables, APIs, and business logic from existing albums
- **Filter-Driven Content**: Automatically include assets based on filter criteria (tags, people, location, date ranges, etc.)
- **No Manual Asset Management**: Cannot have assets manually added or removed (content is purely filter-driven)
- **Separate Sharing System**: Independent sharing and permissions system, separate from album sharing
- **Real-time Updates**: Update content automatically when assets are added/removed or when filter criteria change
- **Independent Metadata**: Separate asset counts, date ranges, and statistics from traditional albums

## Database Schema

### Primary Tables

**Important**: These tables are completely independent from the existing album system. No existing album tables (`albums`, `albums_assets_assets`, `albums_shared_users_users`) are modified or extended.

#### `dynamic_albums`
- `id` (UUID, Primary Key) - Generated using `uuid_generate_v4()`
- `name` (VARCHAR, NOT NULL) - Display name for the dynamic album
- `description` (TEXT, DEFAULT '') - Optional description
- `ownerId` (UUID, NOT NULL, FK to users.id) - Dynamic album owner
- `albumThumbnailAssetId` (UUID, FK to assets.id, NULLABLE) - Representative thumbnail
- `createdAt` (TIMESTAMP WITH TIME ZONE, DEFAULT NOW())
- `updatedAt` (TIMESTAMP WITH TIME ZONE, DEFAULT NOW())
- `deletedAt` (TIMESTAMP WITH TIME ZONE, NULLABLE) - Soft delete support
- `isActivityEnabled` (BOOLEAN, DEFAULT TRUE) - Activity feed integration
- `order` (VARCHAR, DEFAULT 'desc') - Asset ordering preference (AssetOrder enum)
- `updateId` (UUID, NOT NULL, DEFAULT immich_uuid_v7()) - For sync operations

#### `dynamic_album_filters`
- `id` (UUID, Primary Key) - Generated using `uuid_generate_v4()`
- `dynamicAlbumId` (UUID, NOT NULL, FK to dynamic_albums.id)
- `filterType` (VARCHAR, NOT NULL) - 'tag', 'person', 'location', 'date_range', etc.
- `filterValue` (JSONB, NOT NULL) - Filter-specific configuration
- `createdAt` (TIMESTAMP WITH TIME ZONE, DEFAULT NOW())

#### `dynamic_album_shares`
- `dynamicAlbumId` (UUID, NOT NULL, FK to dynamic_albums.id)
- `userId` (UUID, NOT NULL, FK to users.id)
- `role` (VARCHAR, NOT NULL, DEFAULT 'editor') - 'viewer', 'editor', 'admin'
- `createdAt` (TIMESTAMP WITH TIME ZONE, DEFAULT NOW())
- Primary Key: (dynamicAlbumId, userId)

### Audit Tables (Optional)
- `dynamic_albums_audit` - Track creation/deletion
- `dynamic_album_shares_audit` - Track sharing changes

### Database Schema Notes
- **Table Naming**: Uses snake_case for table names (`dynamic_albums`, `dynamic_album_filters`, `dynamic_album_shares`)
- **Column Naming**: Uses camelCase for column names (`ownerId`, `albumThumbnailAssetId`, `dynamicAlbumId`, `filterType`)
- **Primary Keys**: All use UUID with `uuid_generate_v4()` for generation
- **Timestamps**: All tables include `createdAt` and `updatedAt` with automatic triggers
- **Soft Deletes**: Main table supports soft deletes with `deletedAt` column
- **Sync Support**: Uses `updateId` with `immich_uuid_v7()` for sync operations

### Schema Registration
- **Table Classes**: Create `DynamicAlbumTable`, `DynamicAlbumFilterTable`, `DynamicAlbumShareTable` in `src/schema/tables/`
- **Enum Registration**: Register `dynamic_album_filter_type_enum` in `src/schema/enums.ts`
- **Database Integration**: Add tables to `ImmichDatabase` class in `src/schema/index.ts`
- **Migration**: Create migration file in `src/schema/migrations/` following existing naming pattern

## Filter System

### Supported Filter Types

#### 1. Tag Filters
- **Type**: `'tag'`
- **Value**: `{ "tagIds": ["uuid1", "uuid2"], "operator": "AND" | "OR" }`
- **Behavior**: Include assets that have ALL (AND) or ANY (OR) of the specified tags

#### 2. Person Filters
- **Type**: `'person'`
- **Value**: `{ "personIds": ["uuid1", "uuid2"], "operator": "AND" | "OR" }`
- **Behavior**: Include assets that contain ALL or ANY of the specified people

#### 3. Location Filters
- **Type**: `'location'`
- **Value**: `{ "cities": ["city1", "city2"], "countries": ["country1"], "states": ["state1"] }`
- **Behavior**: Include assets from specified geographic locations

#### 4. Date Range Filters
- **Type**: `'date_range'`
- **Value**: `{ "startDate": "2023-01-01", "endDate": "2023-12-31", "field": "capture" | "upload" }`
- **Behavior**: Include assets captured/uploaded within the specified date range

#### 5. Asset Type Filters
- **Type**: `'asset_type'`
- **Value**: `{ "types": ["image", "video"], "favorites": true | false | null }`
- **Behavior**: Include assets of specified types and/or favorite status

### Filter Combination Logic
- Multiple filters of the same type use the specified operator (AND/OR)
- Different filter types are combined with AND logic
- Example: Tag filter (OR) + Person filter (AND) + Date range = Assets that match tags OR person AND are within date range

### Enum Patterns
- **Filter Type Enum**: `DynamicAlbumFilterType` following existing enum patterns
- **Filter Operator Enum**: `DynamicAlbumFilterOperator` for AND/OR logic
- **Enum Values**: Use lowercase with underscores (e.g., `TAG`, `PERSON`, `LOCATION`)
- **Enum Registration**: Register in `src/schema/enums.ts` for database enum types
- **Enum Usage**: Use in DTOs, database columns, and validation decorators

## API Design

**Note**: All endpoints use the `/dynamic-albums` prefix to clearly distinguish them from the existing `/albums` endpoints. This ensures complete separation between the two systems.

### Endpoints

#### Dynamic Albums Management
- `GET /dynamic-albums` - List user's dynamic albums
- `POST /dynamic-albums` - Create new dynamic album
- `GET /dynamic-albums/:id` - Get dynamic album details
- `PUT /dynamic-albums/:id` - Update dynamic album
- `DELETE /dynamic-albums/:id` - Delete dynamic album

#### Asset Access
- `GET /dynamic-albums/:id/assets` - Get assets in dynamic album (paginated)
- `GET /dynamic-albums/:id/assets/count` - Get asset count
- `GET /dynamic-albums/:id/assets/metadata` - Get date range, location stats, etc.

#### Sharing
- `POST /dynamic-albums/:id/share` - Share dynamic album with user
- `PUT /dynamic-albums/:id/share/:userId` - Update sharing permissions
- `DELETE /dynamic-albums/:id/share/:userId` - Remove sharing
- `GET /dynamic-albums/shared` - List shared dynamic albums

#### Statistics
- `GET /dynamic-albums/statistics` - Get counts (owned, shared, total)

### Request/Response DTOs

#### CreateDynamicAlbumDto
```typescript
{
  name: string;
  description?: string;
  filters: DynamicAlbumFilterDto[];
  order?: AssetOrder; // Uses existing AssetOrder enum
  isActivityEnabled?: boolean;
}
```

#### DynamicAlbumFilterDto
```typescript
{
  type: DynamicAlbumFilterType; // Uses enum instead of string literal
  value: object; // Filter-specific configuration
}
```

#### DynamicAlbumFilterType Enum
```typescript
export enum DynamicAlbumFilterType {
  TAG = 'tag',
  PERSON = 'person', 
  LOCATION = 'location',
  DATE_RANGE = 'date_range',
  ASSET_TYPE = 'asset_type',
  METADATA = 'metadata'
}
```

#### DynamicAlbumResponseDto
```typescript
{
  id: string;
  name: string;
  description: string;
  owner: UserResponseDto;
  filters: DynamicAlbumFilterDto[];
  assetCount: number;
  startDate?: Date;
  endDate?: Date;
  albumThumbnailAssetId?: string;
  order: AssetOrder; // Uses existing AssetOrder enum
  isActivityEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  sharedUsers: DynamicAlbumShareDto[];
}
```

## Implementation Components

### 1. Database Layer

**Independent Repositories**: These repositories are completely separate from existing album repositories and do not extend or modify them.

#### Repositories
- `DynamicAlbumRepository` - CRUD operations for dynamic albums (independent from `AlbumRepository`)
- `DynamicAlbumFilterRepository` - Filter management (new, no existing equivalent)
- `DynamicAlbumShareRepository` - Sharing functionality (independent from `AlbumUserRepository`)

#### Repository Patterns
- **Naming**: Follows existing pattern: `{Entity}Repository`
- **Injection**: Uses `@InjectKysely()` for database access
- **Logging**: Includes `LoggingRepository` with context set to repository name
- **Decorators**: Uses `@Injectable()`, `@GenerateSql()`, `@Chunked()` where appropriate
- **Methods**: Follow existing patterns like `getById()`, `create()`, `update()`, `delete()`

#### Key Methods
- `create()` - Create album with filters
- `getById()` - Get album with filters and metadata
- `getAssets()` - Get filtered assets with pagination
- `getAssetCount()` - Get count of matching assets
- `getMetadata()` - Get date ranges, location stats
- `updateFilters()` - Update filters and recalculate content

### 2. Service Layer

**Independent Service**: This service is completely separate from the existing `AlbumService` and does not extend or modify it.

#### DynamicAlbumService
- Dynamic album CRUD operations (independent from `AlbumService`)
- Filter validation and processing (new functionality)
- Asset querying using existing infrastructure (reuses `AssetRepository` only)
- Permission checking (independent permission system)
- Event emission for activity feeds (separate events from album events)

#### Service Patterns
- **Naming**: Follows existing pattern: `{Entity}Service`
- **Inheritance**: Extends `BaseService` to inherit all repository dependencies
- **Logging**: Uses injected `LoggingRepository` with context set to service name
- **Decorators**: Uses `@Injectable()`, `@Telemetry()` where appropriate
- **Error Handling**: Uses existing exception patterns (`BadRequestException`, `NotFoundException`)
- **Validation**: Uses existing validation utilities and decorators

#### Key Methods
- `create()` - Validate filters, create album
- `getAssets()` - Apply filters, return assets
- `updateFilters()` - Validate new filters, update album
- `getMetadata()` - Calculate album statistics
- `validateFilters()` - Ensure filter configuration is valid

### 3. Controller Layer

**Independent Controller**: This controller is completely separate from the existing `AlbumController` and uses different endpoints.

#### DynamicAlbumController
- HTTP endpoint handlers (separate from `AlbumController`)
- Request validation (independent DTOs)
- Response formatting (separate response types)
- Error handling (dynamic album specific errors)

#### Controller Patterns
- **Naming**: Follows existing pattern: `{Entity}Controller`
- **Decorators**: Uses `@Controller('dynamic-albums')`, `@ApiTags('Dynamic Albums')`
- **Logging**: Uses injected `LoggingRepository` with context set to controller name
- **Validation**: Uses existing validation decorators (`@ValidateUUID()`, `@Optional()`, etc.)
- **Swagger**: Uses `@ApiProperty()` decorators for API documentation
- **Error Handling**: Uses existing exception filters and interceptors

### 4. Permission System

**Independent Permissions**: These permissions are completely separate from existing album permissions and do not modify the existing permission system.

#### New Permissions
- `DYNAMIC_ALBUM_CREATE` - Create dynamic albums (separate from `ALBUM_CREATE`)
- `DYNAMIC_ALBUM_READ` - View dynamic albums (separate from `ALBUM_READ`)
- `DYNAMIC_ALBUM_UPDATE` - Modify dynamic albums (separate from `ALBUM_UPDATE`)
- `DYNAMIC_ALBUM_DELETE` - Delete dynamic albums (separate from `ALBUM_DELETE`)
- `DYNAMIC_ALBUM_SHARE` - Share dynamic albums (separate from `ALBUM_SHARE`)

#### Permission Patterns
- **Enum Naming**: Follows existing pattern: `DYNAMIC_ALBUM_{ACTION}`
- **Integration**: Uses existing `Permission` enum and permission checking utilities
- **Access Control**: Uses existing `AccessRepository` and `checkAccess()` utilities
- **Role System**: Reuses existing `AlbumUserRole` enum for sharing roles

#### Access Control
- Owner has full access
- Shared users have role-based access
- Filter permissions inherited from underlying resources (tags, people, etc.)

## Integration Points

### 1. Existing Asset Repository
- Extend `searchAssetBuilder()` to support dynamic album filters
- Add new query builder functions for each filter type
- Reuse existing tag, person, location query utilities
- Use existing `withTags()`, `withFaces()`, `withExif()` query builders

### 2. DTOs and Validation

#### DTOs
- `CreateDynamicAlbumDto` - For creating new dynamic albums
- `UpdateDynamicAlbumDto` - For updating existing dynamic albums
- `DynamicAlbumResponseDto` - For API responses
- `DynamicAlbumFilterDto` - For filter configuration
- `DynamicAlbumShareDto` - For sharing information

#### DTO Patterns
- **Naming**: Follows existing pattern: `{Action}{Entity}Dto`
- **Validation**: Uses existing validation decorators (`@ValidateUUID()`, `@Optional()`, `@IsString()`, etc.)
- **Swagger**: Uses `@ApiProperty()` decorators for documentation
- **File Location**: Placed in `src/dtos/dynamic-album.dto.ts`
- **Imports**: Uses existing validation utilities and enums
- **Response Types**: Follows existing response patterns with proper typing

### 3. Event System
- Emit events for dynamic album creation/updates
- Integrate with activity feed system
- Notify shared users of changes

### 4. Thumbnail Management
- Automatic thumbnail selection from filtered assets
- Thumbnail updates when filters change
- Fallback to default thumbnail when no assets match

### 5. Search Integration
- Include dynamic albums in search results
- Search within dynamic album assets
- Filter search results by dynamic album membership

## Performance Considerations

### 1. Query Optimization
- Use existing indexed columns (tags, people, dates, locations)
- Implement efficient filter combination logic
- Consider materialized views for complex filter combinations

### 2. Caching Strategy
- Cache dynamic album metadata (counts, date ranges)
- Cache filtered asset lists with appropriate TTL
- Invalidate cache when filters or assets change

### 3. Pagination
- Support efficient pagination for large result sets
- Use cursor-based pagination for consistent results
- Implement proper ordering for paginated results

## Migration Strategy

### Phase 1: Core Implementation
1. Create database schema
2. Implement basic CRUD operations
3. Add tag filter support
4. Create API endpoints
5. Add permission system


> Attention : Do not do the following phases for now, this is just a draft and here to have an idea of the implementation.

### Phase 2: Advanced Filters
1. Add person filter support
2. Add location filter support
3. Add date range filter support
4. Add asset type filter support

### Phase 3: Integration
1. Integrate with activity feed
2. Add search integration
3. Implement thumbnail management
4. Add sharing notifications

### Phase 4: Optimization
1. Performance tuning
2. Caching implementation
3. Query optimization
4. Monitoring and metrics

## Testing Strategy

### Unit Tests
- Filter validation logic
- Query builder functions
- Permission checking
- DTO validation

### Integration Tests
- API endpoint behavior
- Database operations
- Filter combination logic
- Sharing functionality

## Future Enhancements

### Additional Filter Types
- Custom metadata filters (camera, lens, ...)
