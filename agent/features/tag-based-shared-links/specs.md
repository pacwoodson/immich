# Tag-Based Shared Links - Technical Specifications

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Schema Changes](#database-schema-changes)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Mobile Implementation](#mobile-implementation)
6. [Security & Permissions](#security--permissions)
7. [Performance Considerations](#performance-considerations)
8. [Testing Strategy](#testing-strategy)
9. [Migration & Rollout](#migration--rollout)
10. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## Architecture Overview

### Design Decision: Extend Existing SharedLinkType Enum

We will add a third type to the existing `SharedLinkType` enum to maintain consistency with the current architecture:

```typescript
export enum SharedLinkType {
  Album = 'ALBUM',           // Existing - dynamic album sharing
  Individual = 'INDIVIDUAL', // Existing - static asset sharing
  Tag = 'TAG'                // NEW - dynamic tag-based sharing
}
```

**Rationale:**
- **Consistency**: Mirrors the Album link pattern (dynamic, single-entity reference)
- **Simplicity**: Minimal changes to existing codebase
- **Performance**: Direct tag-to-asset query via existing `tag_asset` junction table
- **User Experience**: Clear mental model - "share a tag" works like "share an album"

### Data Flow

```
User creates tag link
    ↓
Store tagId in shared_link table
    ↓
Public user accesses link by key/slug
    ↓
Auth validates link (expiry, password)
    ↓
Repository queries tag_asset table
    ↓
Fetch all assets with tagId
    ↓
Return assets with metadata (respecting showExif)
```

---

## Database Schema Changes

### 1. Modify `shared_link` Table

**File:** `server/src/schema/tables/shared-link.table.ts`

Add a new foreign key column for tag references:

```typescript
@Table('shared_link')
export class SharedLinkTable {
  // ... existing columns ...

  @ForeignKeyColumn(() => AlbumTable, { nullable: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  albumId!: string | null;

  // NEW COLUMN
  @ForeignKeyColumn(() => TagTable, { nullable: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  tagId!: string | null;

  // ... rest of columns ...
}
```

**Schema Constraints:**
- Exactly ONE of `albumId`, `tagId`, or `shared_link_asset` entries must be set (enforced at service layer)
- `tagId` is nullable to support existing link types
- `onDelete: CASCADE` - deleting a tag removes associated shared links
- Add database index on `tagId` for query performance

### 2. Database Migration

**File:** `server/src/migrations/YYYYMMDDHHMMSS-AddTagIdToSharedLink.ts`

```typescript
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('shared_link')
    .addColumn('tagId', 'uuid', (col) => col.references('tag.id').onDelete('cascade'))
    .execute();

  await db.schema
    .createIndex('shared_link_tagId_idx')
    .on('shared_link')
    .column('tagId')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('shared_link_tagId_idx').execute();
  await db.schema.alterTable('shared_link').dropColumn('tagId').execute();
}
```

**Migration Notes:**
- Add column as nullable (all existing rows have `NULL` tagId)
- Create index for query optimization
- Reversible migration for rollback safety

### 3. Type Definition Update

**File:** `server/src/database.ts`

Update the `SharedLink` TypeScript type:

```typescript
export type SharedLink = {
  id: string;
  album?: Album | null;
  albumId: string | null;
  tag?: Tag | null;           // NEW
  tagId: string | null;       // NEW
  allowDownload: boolean;
  allowUpload: boolean;
  assets: MapAsset[];
  createdAt: Date;
  description: string | null;
  expiresAt: Date | null;
  key: Buffer;
  password: string | null;
  showExif: boolean;
  type: SharedLinkType;
  userId: string;
  slug: string | null;
};
```

---

## Backend Implementation

### 1. Enum Update

**File:** `server/src/enum.ts` (line 275)

```typescript
export enum SharedLinkType {
  Album = 'ALBUM',
  Individual = 'INDIVIDUAL',
  Tag = 'TAG',  // NEW
}
```

### 2. DTO Changes

**File:** `server/src/dtos/shared-link.dto.ts`

#### 2.1 Update `SharedLinkCreateDto`

```typescript
export class SharedLinkCreateDto {
  @ValidateEnum({ enum: SharedLinkType, name: 'SharedLinkType' })
  type!: SharedLinkType;

  @ValidateUUID({ each: true, optional: true })
  assetIds?: string[];

  @ValidateUUID({ optional: true })
  albumId?: string;

  // NEW FIELD
  @ValidateUUID({ optional: true })
  tagId?: string;

  // ... rest of fields ...
}
```

**Validation Rules:**
- Exactly one of `albumId`, `tagId`, or `assetIds` must be provided based on `type`
- Add custom validator to enforce mutual exclusivity
- `tagId` required when `type === SharedLinkType.Tag`

#### 2.2 Update `SharedLinkResponseDto`

```typescript
export class SharedLinkResponseDto {
  // ... existing fields ...

  album?: AlbumResponseDto;
  tag?: TagResponseDto;  // NEW - include tag metadata in response

  // ... rest of fields ...
}
```

#### 2.3 Update Mapper Functions

**In `mapSharedLink()`:**

```typescript
export function mapSharedLink(sharedLink: SharedLink): SharedLinkResponseDto {
  const linkAssets = sharedLink.assets || [];

  return {
    // ... existing mappings ...
    album: sharedLink.album ? mapAlbumWithoutAssets(sharedLink.album) : undefined,
    tag: sharedLink.tag ? mapTag(sharedLink.tag) : undefined,  // NEW
    // ... rest of mappings ...
  };
}
```

**In `mapSharedLinkWithoutMetadata()`:**

```typescript
export function mapSharedLinkWithoutMetadata(sharedLink: SharedLink): SharedLinkResponseDto {
  const linkAssets = sharedLink.assets || [];
  const albumAssets = (sharedLink?.album?.assets || []).map((asset) => asset);
  const tagAssets = (sharedLink?.tag?.assets || []).map((asset) => asset);  // NEW

  const assets = _.uniqBy([...linkAssets, ...albumAssets, ...tagAssets], (asset) => asset.id);

  return {
    // ... existing mappings with combined assets ...
    tag: sharedLink.tag ? mapTag(sharedLink.tag) : undefined,  // NEW
  };
}
```

### 3. Repository Changes

**File:** `server/src/repositories/shared-link.repository.ts`

#### 3.1 Update `get()` Method

Add a left join to fetch tag assets dynamically:

```typescript
@GenerateSql({ params: [DummyValue.UUID, DummyValue.UUID] })
get(userId: string, id: string) {
  return this.db
    .selectFrom('shared_link')
    .selectAll('shared_link')

    // Existing: Join for individual assets
    .leftJoinLateral(/* shared_link_asset join */)

    // Existing: Join for album assets
    .leftJoinLateral(/* album assets join */)

    // NEW: Join for tag assets
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom('tag')
          .selectAll('tag')
          .whereRef('tag.id', '=', 'shared_link.tagId')
          .leftJoin('tag_asset', 'tag_asset.tagId', 'tag.id')
          .leftJoinLateral(
            (eb) =>
              eb
                .selectFrom('asset')
                .selectAll('asset')
                .whereRef('tag_asset.assetId', '=', 'asset.id')
                .where('asset.deletedAt', 'is', null)
                .innerJoinLateral(/* asset_exif join */)
                .select((eb) => eb.fn.toJson('exifInfo').as('exifInfo'))
                .orderBy('asset.fileCreatedAt', 'asc')
                .as('tagAssets'),
            (join) => join.onTrue(),
          )
          .select((eb) =>
            eb.fn
              .coalesce(
                eb.fn
                  .jsonAgg('tagAssets')
                  .orderBy('tagAssets.fileCreatedAt', 'asc')
                  .filterWhere('tagAssets.id', 'is not', null),
                sql`'[]'`,
              )
              .as('assets'),
          )
          .groupBy(['tag.id'])
          .as('tag'),
      (join) => join.onTrue(),
    )

    // Aggregate all asset sources
    .select((eb) =>
      eb.fn
        .coalesce(
          eb.fn.jsonAgg('a').filterWhere('a.id', 'is not', null),
          sql`'[]'`
        )
        .$castTo<MapAsset[]>()
        .as('assets'),
    )
    .groupBy(['shared_link.id', sql`"album".*`, sql`"tag".*`])
    .select((eb) => eb.fn.toJson('album').$castTo<Album | null>().as('album'))
    .select((eb) => eb.fn.toJson('tag').$castTo<Tag | null>().as('tag'))  // NEW
    .where('shared_link.id', '=', id)
    .where('shared_link.userId', '=', userId)
    .where((eb) =>
      eb.or([
        eb('shared_link.type', '=', SharedLinkType.Individual),
        eb('album.id', 'is not', null),
        eb('tag.id', 'is not', null),  // NEW
      ])
    )
    .orderBy('shared_link.createdAt', 'desc')
    .executeTakeFirst();
}
```

**Key Changes:**
1. Add lateral join to `tag` table via `tagId`
2. Join to `tag_asset` to get asset IDs
3. Fetch full asset data with EXIF
4. Include tag assets in the aggregated assets array
5. Update `where` clause to include tag type validation

#### 3.2 Update `getAll()` Method

Similar changes for listing all shared links:

```typescript
getAll({ userId, albumId }: SharedLinkSearchOptions) {
  return this.db
    .selectFrom('shared_link')
    .selectAll('shared_link')
    .where('shared_link.userId', '=', userId)

    // Existing joins for individual and album assets...

    // NEW: Join for tags
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom('tag')
          .selectAll('tag')
          .whereRef('tag.id', '=', 'shared_link.tagId')
          .as('tag'),
      (join) => join.onTrue(),
    )
    .select((eb) => eb.fn.toJson('tag').$castTo<Tag | null>().as('tag'))

    .where((eb) =>
      eb.or([
        eb('shared_link.type', '=', SharedLinkType.Individual),
        eb('album.id', 'is not', null),
        eb('tag.id', 'is not', null),  // NEW
      ])
    )
    .$if(!!albumId, (eb) => eb.where('shared_link.albumId', '=', albumId!))
    .orderBy('shared_link.createdAt', 'desc')
    .distinctOn(['shared_link.createdAt'])
    .execute();
}
```

#### 3.3 Update `authBuilder()` Method

Ensure tag links can be authenticated:

```typescript
private authBuilder() {
  return this.db
    .selectFrom('shared_link')
    .leftJoin('album', 'album.id', 'shared_link.albumId')
    .leftJoin('tag', 'tag.id', 'shared_link.tagId')  // NEW
    .where('album.deletedAt', 'is', null)
    .select((eb) => [
      ...columns.authSharedLink,
      jsonObjectFrom(
        eb.selectFrom('user')
          .select(columns.authUser)
          .whereRef('user.id', '=', 'shared_link.userId'),
      ).as('user'),
    ])
    .where((eb) =>
      eb.or([
        eb('shared_link.type', '=', SharedLinkType.Individual),
        eb('album.id', 'is not', null),
        eb('tag.id', 'is not', null),  // NEW
      ])
    );
}
```

#### 3.4 Update `create()` and `update()` Methods

Add support for `tagId`:

```typescript
async create(entity: Insertable<SharedLinkTable> & { assetIds?: string[] }) {
  const { id } = await this.db
    .insertInto('shared_link')
    .values({
      ..._.omit(entity, 'assetIds'),
      tagId: entity.tagId || null,  // Support tagId
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  // ... rest of create logic ...
}

async update(entity: Updateable<SharedLinkTable> & { id: string; assetIds?: string[] }) {
  const { id } = await this.db
    .updateTable('shared_link')
    .set({
      ..._.omit(entity, 'assets', 'album', 'tag', 'assetIds'),
      tagId: entity.tagId || null,  // Support tagId updates
    })
    .where('shared_link.id', '=', entity.id)
    .returningAll()
    .executeTakeFirstOrThrow();

  // ... rest of update logic ...
}
```

### 4. Service Changes

**File:** `server/src/services/shared-link.service.ts`

#### 4.1 Update `create()` Method

Add validation and handling for tag-based links:

```typescript
async create(auth: AuthDto, dto: SharedLinkCreateDto): Promise<SharedLinkResponseDto> {
  switch (dto.type) {
    case SharedLinkType.Album: {
      if (!dto.albumId) {
        throw new BadRequestException('Invalid albumId');
      }
      await this.requireAccess({ auth, permission: Permission.AlbumShare, ids: [dto.albumId] });
      break;
    }

    case SharedLinkType.Individual: {
      if (!dto.assetIds || dto.assetIds.length === 0) {
        throw new BadRequestException('Invalid assetIds');
      }
      await this.requireAccess({ auth, permission: Permission.AssetShare, ids: dto.assetIds });
      break;
    }

    // NEW CASE
    case SharedLinkType.Tag: {
      if (!dto.tagId) {
        throw new BadRequestException('Invalid tagId');
      }

      // Validate user owns the tag
      const tag = await this.tagRepository.get(dto.tagId);
      if (!tag || tag.userId !== auth.user.id) {
        throw new BadRequestException('Tag not found or access denied');
      }

      // Get all assets with this tag and check share permission
      const tagAssets = await this.tagRepository.getAssets(dto.tagId);
      if (tagAssets.length > 0) {
        await this.requireAccess({
          auth,
          permission: Permission.AssetShare,
          ids: tagAssets.map(a => a.id)
        });
      }

      break;
    }
  }

  try {
    const sharedLink = await this.sharedLinkRepository.create({
      key: this.cryptoRepository.randomBytes(50),
      userId: auth.user.id,
      type: dto.type,
      albumId: dto.albumId || null,
      tagId: dto.tagId || null,  // NEW
      assetIds: dto.assetIds,
      description: dto.description || null,
      password: dto.password,
      expiresAt: dto.expiresAt || null,
      allowUpload: dto.allowUpload ?? true,
      allowDownload: dto.showMetadata === false ? false : (dto.allowDownload ?? true),
      showExif: dto.showMetadata ?? true,
      slug: dto.slug || null,
    });

    return this.mapToSharedLink(sharedLink, { withExif: true });
  } catch (error) {
    this.handleError(error);
  }
}
```

**Key Validation Points:**
1. Ensure `tagId` is provided for Tag type
2. Verify user owns the tag
3. Check user has permission to share all tagged assets
4. If no assets have the tag yet, allow link creation (empty state)

#### 4.2 Update `update()` Method

Prevent changing `tagId` after creation (similar to `albumId` behavior):

```typescript
async update(auth: AuthDto, id: string, dto: SharedLinkEditDto) {
  await this.findOrFail(auth.user.id, id);

  // Prevent type changes and entity ID changes
  // Note: We don't allow changing albumId or tagId after creation

  try {
    const sharedLink = await this.sharedLinkRepository.update({
      id,
      userId: auth.user.id,
      description: dto.description,
      password: dto.password,
      expiresAt: dto.changeExpiryTime && !dto.expiresAt ? null : dto.expiresAt,
      allowUpload: dto.allowUpload,
      allowDownload: dto.allowDownload,
      showExif: dto.showMetadata,
      slug: dto.slug || null,
    });
    return this.mapToSharedLink(sharedLink, { withExif: true });
  } catch (error) {
    this.handleError(error);
  }
}
```

#### 4.3 Block Asset Add/Remove for Tag Links

Tag links are dynamic, so manual asset management doesn't apply:

```typescript
async addAssets(auth: AuthDto, id: string, dto: AssetIdsDto): Promise<AssetIdsResponseDto[]> {
  const sharedLink = await this.findOrFail(auth.user.id, id);

  if (sharedLink.type !== SharedLinkType.Individual) {
    throw new BadRequestException('Invalid shared link type. Assets can only be added to Individual links.');
  }

  // ... rest of implementation ...
}

async removeAssets(auth: AuthDto, id: string, dto: AssetIdsDto): Promise<AssetIdsResponseDto[]> {
  const sharedLink = await this.findOrFail(auth.user.id, id);

  if (sharedLink.type !== SharedLinkType.Individual) {
    throw new BadRequestException('Invalid shared link type. Assets can only be removed from Individual links.');
  }

  // ... rest of implementation ...
}
```

### 5. Controller Changes

**File:** `server/src/controllers/shared-link.controller.ts`

No changes required! The existing endpoints automatically support the new type through DTOs:

- `POST /shared-links` - Accepts `tagId` in body via updated `SharedLinkCreateDto`
- `GET /shared-links/:id` - Returns tag data via updated `SharedLinkResponseDto`
- `GET /shared-links/me` - Public access works automatically

**OpenAPI Documentation:**
- Run `make open-api` after DTO changes to regenerate TypeScript and Dart SDKs
- OpenAPI spec will automatically reflect new `tagId` field and `Tag` enum value

---

## Frontend Implementation

### 1. Web UI Changes

#### 1.1 Tags Page - Add Share Button

**File:** `web/src/routes/(user)/tags/[[photos=photos]]/[[assetId=id]]/+page.svelte`

Add a "Share" button to the tag detail view:

```svelte
<script lang="ts">
  import { createSharedLink } from '@immich/sdk';
  import { SharedLinkType } from '@immich/sdk';

  let selectedTag = $state<TagResponseDto>();

  async function handleShareTag() {
    if (!selectedTag) return;

    try {
      const link = await createSharedLink({
        type: SharedLinkType.Tag,
        tagId: selectedTag.id,
        description: `Shared photos tagged "${selectedTag.name}"`,
        allowDownload: true,
        showMetadata: true,
      });

      // Show share modal with link details
      $showShareModal = link;
    } catch (error) {
      notificationController.show({
        message: 'Failed to create shared link',
        type: NotificationType.Error,
      });
    }
  }
</script>

<button onclick={handleShareTag}>
  <Icon path={mdiShareVariant} />
  Share Tag
</button>
```

**UI Location:**
- Add to tag sidebar context menu
- Add to tag page header toolbar
- Show icon next to tag name in tag tree

#### 1.2 Create/Edit Shared Link Modal

**File:** `web/src/lib/modals/CreateSharedLinkModal.svelte`

Update modal to support tag selection:

```svelte
<script lang="ts">
  import { SharedLinkType } from '@immich/sdk';

  let linkType = $state<SharedLinkType>(SharedLinkType.Album);
  let selectedAlbum = $state<AlbumResponseDto>();
  let selectedTag = $state<TagResponseDto>();  // NEW
  let selectedAssets = $state<AssetResponseDto[]>([]);

  // Fetch user's tags for dropdown
  let userTags = $state<TagResponseDto[]>([]);

  onMount(async () => {
    userTags = await getAllTags();
  });
</script>

<RadioGroup bind:value={linkType}>
  <Radio value={SharedLinkType.Album}>Album</Radio>
  <Radio value={SharedLinkType.Individual}>Individual Assets</Radio>
  <Radio value={SharedLinkType.Tag}>Tag</Radio>  <!-- NEW -->
</RadioGroup>

{#if linkType === SharedLinkType.Album}
  <AlbumPicker bind:value={selectedAlbum} />
{:else if linkType === SharedLinkType.Individual}
  <AssetPicker bind:value={selectedAssets} />
{:else if linkType === SharedLinkType.Tag}
  <!-- NEW TAG PICKER -->
  <TagPicker bind:value={selectedTag} tags={userTags} />
{/if}
```

#### 1.3 Shared Links List

**File:** `web/src/lib/components/shared-links/shared-link-card.svelte`

Display tag information for tag-based links:

```svelte
<script lang="ts">
  export let link: SharedLinkResponseDto;
</script>

<div class="link-card">
  {#if link.type === SharedLinkType.Album}
    <Icon path={mdiImageAlbum} />
    <span>{link.album?.albumName}</span>
  {:else if link.type === SharedLinkType.Tag}
    <!-- NEW -->
    <Icon path={mdiTag} />
    <span style="color: {link.tag?.color}">{link.tag?.name}</span>
  {:else}
    <Icon path={mdiImage} />
    <span>{link.assets.length} assets</span>
  {/if}

  <span>{link.assets.length} photos</span>
  <CopyLinkButton {link} />
</div>
```

#### 1.4 Public Link Viewer

**File:** `web/src/routes/(user)/share/[key]/+page.svelte`

No changes needed! The page already handles `sharedLink.assets` array, which will be populated with tag assets.

Add visual indicator that this is a tag-based link:

```svelte
{#if data.sharedLink.type === SharedLinkType.Tag && data.sharedLink.tag}
  <div class="tag-indicator">
    <Icon path={mdiTag} />
    <span style="color: {data.sharedLink.tag.color}">
      {data.sharedLink.tag.name}
    </span>
  </div>
{/if}
```

### 2. SDK Regeneration

After updating DTOs and running `make open-api`, the TypeScript SDK at `open-api/typescript-sdk/` will automatically include:

- `SharedLinkType.Tag` enum value
- `tagId` field in `SharedLinkCreateDto`
- `tag` field in `SharedLinkResponseDto`

Web imports will work automatically:
```typescript
import { SharedLinkType, TagResponseDto } from '@immich/sdk';
```

---

## Mobile Implementation

### 1. Dart SDK Regeneration

**File:** `mobile/openapi/lib/model/shared_link_type.dart`

After running `make open-api`, the Dart enum will include:

```dart
enum SharedLinkType {
  ALBUM,
  INDIVIDUAL,
  TAG,  // NEW
}
```

### 2. Create Tag Shared Link

**File:** `mobile/lib/providers/shared_link.provider.dart`

Add method to create tag-based links:

```dart
Future<SharedLinkResponseDto?> createTagSharedLink({
  required String tagId,
  String? description,
  String? password,
  DateTime? expiresAt,
  bool allowDownload = true,
  bool showMetadata = true,
}) async {
  try {
    final dto = SharedLinkCreateDto(
      type: SharedLinkType.TAG,
      tagId: tagId,
      description: description,
      password: password,
      expiresAt: expiresAt,
      allowDownload: allowDownload,
      showMetadata: showMetadata,
    );

    return await _apiService.sharedLinksApi.createSharedLink(dto);
  } catch (e) {
    log.severe('Failed to create tag shared link', e);
    return null;
  }
}
```

### 3. Tag Detail View - Add Share Button

**File:** `mobile/lib/pages/tags/tag_detail_page.dart`

Add a share icon to the app bar:

```dart
AppBar(
  title: Text(tag.name),
  actions: [
    IconButton(
      icon: const Icon(Icons.share),
      onPressed: () => _showShareTagDialog(),
    ),
  ],
)

Future<void> _showShareTagDialog() async {
  final link = await ref.read(sharedLinkProvider.notifier).createTagSharedLink(
    tagId: tag.id,
    description: 'Photos tagged "${tag.name}"',
  );

  if (link != null) {
    _showShareSheet(link);
  }
}
```

### 4. Shared Links List

**File:** `mobile/lib/pages/sharing/shared_links_page.dart`

Display tag information:

```dart
Widget _buildLinkTile(SharedLinkResponseDto link) {
  return ListTile(
    leading: _getLeadingIcon(link),
    title: _getTitle(link),
    subtitle: Text('${link.assets.length} photos'),
    trailing: IconButton(
      icon: const Icon(Icons.copy),
      onPressed: () => _copyLink(link),
    ),
  );
}

Widget _getLeadingIcon(SharedLinkResponseDto link) {
  switch (link.type) {
    case SharedLinkType.ALBUM:
      return const Icon(Icons.photo_album);
    case SharedLinkType.TAG:
      return Icon(Icons.label, color: link.tag?.color != null
        ? Color(int.parse(link.tag!.color!.substring(1), radix: 16))
        : null);
    case SharedLinkType.INDIVIDUAL:
      return const Icon(Icons.photo);
  }
}

Text _getTitle(SharedLinkResponseDto link) {
  if (link.type == SharedLinkType.ALBUM) {
    return Text(link.album?.albumName ?? 'Album');
  } else if (link.type == SharedLinkType.TAG) {
    return Text(link.tag?.name ?? 'Tag');
  } else {
    return const Text('Individual Assets');
  }
}
```

---

## Security & Permissions

### 1. Permission Checks

**Required Permissions:**

| Action | Permission | Validation |
|--------|-----------|------------|
| Create tag link | `Permission.TagRead` + `Permission.AssetShare` | User owns tag + can share all tagged assets |
| View tag link | `Permission.SharedLinkRead` | User owns link |
| Access public tag link | None (if not expired/password) | Valid key/slug + not expired |
| Delete tag link | `Permission.SharedLinkDelete` | User owns link |

### 2. Access Control

**Creating Tag Links:**
```typescript
// 1. Verify user owns the tag
const tag = await this.tagRepository.get(dto.tagId);
if (!tag || tag.userId !== auth.user.id) {
  throw new ForbiddenException('Access denied');
}

// 2. Verify user can share ALL tagged assets
const assets = await this.tagRepository.getAssets(dto.tagId);
await this.requireAccess({
  auth,
  permission: Permission.AssetShare,
  ids: assets.map(a => a.id)
});
```

**Public Access:**
- No authentication required for valid, non-expired links
- Password validation via token (existing mechanism)
- `showExif` flag controls metadata visibility

### 3. Tag Deletion Cascade

When a tag is deleted:
- All shared links with `tagId` are CASCADE deleted (database constraint)
- Public users accessing deleted tag links get 404 error
- Users see "Link no longer exists" message

### 4. Privacy Considerations

**Scenario: User tags asset, then shares tag, then another user shares same asset**
- Tag links only show assets the link owner has permission to share at creation time
- Subsequent changes to asset ownership don't affect existing links
- Each user's tag links operate independently

**Scenario: Shared tag with sensitive assets**
- Users must have `AssetShare` permission for ALL tagged assets
- If permission is revoked later, the link continues to work (consistent with album behavior)
- Users should delete links manually if they revoke permissions

---

## Performance Considerations

### 1. Database Query Optimization

**Indexes Required:**
```sql
CREATE INDEX shared_link_tagId_idx ON shared_link (tagId);
CREATE INDEX tag_asset_tagId_idx ON tag_asset (tagId);  -- Already exists
CREATE INDEX tag_asset_assetId_idx ON tag_asset (assetId);  -- Already exists
```

**Query Performance:**
- Tag asset lookup: O(n) where n = assets with tag
- Comparable to album asset lookup (existing pattern)
- Use of lateral joins minimizes N+1 queries

### 2. Caching Strategy

**Asset Count Caching:**
- Cache asset count in shared link response (computed at query time)
- No need for separate count query
- Invalidate on tag asset changes (via events)

**Tag Metadata Caching:**
- Tag name, color, hierarchy cached in repository layer
- Shared with other tag queries (tags page, search, etc.)

### 3. Large Tag Collections

**Scenario: Tag with 10,000+ assets**

Mitigation strategies:
1. **Pagination**: Add `offset` and `limit` to public link viewer
2. **Lazy Loading**: Load assets in batches as user scrolls
3. **Thumbnail Optimization**: Use existing thumbnail pipeline
4. **Asset Ordering**: Default to `fileCreatedAt DESC` (newest first)

**Query Timeout:**
- Use same timeout as album queries (no worse performance)
- Kysely query builder optimizes joins efficiently

### 4. Concurrent Access

**Multiple users accessing same tag link:**
- Read-only queries, no write conflicts
- PostgreSQL handles concurrent reads efficiently
- No locking required

---

## Testing Strategy

### 1. Unit Tests

**File:** `server/test/unit/shared-link.service.spec.ts`

```typescript
describe('SharedLinkService - Tag Links', () => {
  describe('create', () => {
    it('should create a tag-based shared link', async () => {
      const tag = { id: 'tag-1', userId: 'user-1', value: 'Vacation', assets: [] };
      const dto = { type: SharedLinkType.Tag, tagId: 'tag-1' };

      tagRepositoryMock.get.mockResolvedValue(tag);

      await service.create(authStub.admin, dto);

      expect(sharedLinkRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ tagId: 'tag-1', type: SharedLinkType.Tag })
      );
    });

    it('should reject tag link if user does not own tag', async () => {
      const dto = { type: SharedLinkType.Tag, tagId: 'tag-1' };

      tagRepositoryMock.get.mockResolvedValue({ id: 'tag-1', userId: 'other-user' });

      await expect(service.create(authStub.admin, dto)).rejects.toThrow(BadRequestException);
    });

    it('should require asset share permission for all tagged assets', async () => {
      const tag = { id: 'tag-1', userId: 'user-1' };
      const assets = [{ id: 'asset-1' }, { id: 'asset-2' }];

      tagRepositoryMock.get.mockResolvedValue(tag);
      tagRepositoryMock.getAssets.mockResolvedValue(assets);
      accessMock.asset.checkOwnerAccess.mockRejectedValue(new ForbiddenException());

      await expect(service.create(authStub.admin, { type: SharedLinkType.Tag, tagId: 'tag-1' }))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('addAssets', () => {
    it('should reject adding assets to tag link', async () => {
      const link = { id: 'link-1', type: SharedLinkType.Tag, userId: 'user-1' };

      sharedLinkRepositoryMock.get.mockResolvedValue(link);

      await expect(service.addAssets(authStub.admin, 'link-1', { assetIds: ['asset-1'] }))
        .rejects.toThrow(BadRequestException);
    });
  });
});
```

### 2. Integration Tests

**File:** `server/test/integration/shared-link.spec.ts`

```typescript
describe('SharedLink Integration - Tag Links', () => {
  it('should dynamically include newly tagged assets', async () => {
    // Create tag
    const tag = await tagService.create(user, { name: 'Test' });

    // Create shared link for tag
    const link = await sharedLinkService.create(user, {
      type: SharedLinkType.Tag,
      tagId: tag.id
    });

    // Initially empty
    expect(link.assets).toHaveLength(0);

    // Tag an asset
    await tagService.addAssets(user, tag.id, { assetIds: [asset1.id] });

    // Fetch link again
    const updated = await sharedLinkService.get(user, link.id);
    expect(updated.assets).toHaveLength(1);
    expect(updated.assets[0].id).toBe(asset1.id);
  });

  it('should remove assets when untagged', async () => {
    const tag = await tagService.create(user, { name: 'Test' });
    await tagService.addAssets(user, tag.id, { assetIds: [asset1.id] });

    const link = await sharedLinkService.create(user, {
      type: SharedLinkType.Tag,
      tagId: tag.id
    });

    expect(link.assets).toHaveLength(1);

    // Untag the asset
    await tagService.removeAssets(user, tag.id, { assetIds: [asset1.id] });

    const updated = await sharedLinkService.get(user, link.id);
    expect(updated.assets).toHaveLength(0);
  });

  it('should cascade delete link when tag is deleted', async () => {
    const tag = await tagService.create(user, { name: 'Test' });
    const link = await sharedLinkService.create(user, {
      type: SharedLinkType.Tag,
      tagId: tag.id
    });

    await tagService.remove(user, tag.id);

    await expect(sharedLinkService.get(user, link.id))
      .rejects.toThrow(BadRequestException);
  });
});
```

### 3. E2E Tests

**File:** `e2e/src/api/specs/shared-link.e2e-spec.ts`

```typescript
describe('Shared Links E2E - Tag Type', () => {
  let admin: LoginResponseDto;
  let tag: TagResponseDto;
  let asset: AssetFileUploadResponseDto;

  beforeAll(async () => {
    await resetDatabase();
    admin = await api.authApi.adminSignUp(signupDto.admin);
    asset = await uploadAsset(admin.accessToken);
  });

  it('POST /shared-links - create tag link', async () => {
    // Create tag
    tag = await api.tagsApi.createTag({ name: 'E2E Test' }, { headers: asBearerAuth(admin.accessToken) });

    // Tag the asset
    await api.tagsApi.tagAssets(tag.id, { assetIds: [asset.id] }, { headers: asBearerAuth(admin.accessToken) });

    // Create shared link
    const { status, data } = await api.sharedLinksApi.createSharedLink(
      { type: SharedLinkType.Tag, tagId: tag.id },
      { headers: asBearerAuth(admin.accessToken) }
    );

    expect(status).toBe(201);
    expect(data.type).toBe(SharedLinkType.Tag);
    expect(data.tag).toBeDefined();
    expect(data.tag?.id).toBe(tag.id);
    expect(data.assets).toHaveLength(1);
  });

  it('GET /shared-links/me - public access with tag link', async () => {
    const link = await api.sharedLinksApi.createSharedLink(
      { type: SharedLinkType.Tag, tagId: tag.id },
      { headers: asBearerAuth(admin.accessToken) }
    );

    const { status, data } = await api.sharedLinksApi.getMySharedLink({ key: link.data.key });

    expect(status).toBe(200);
    expect(data.assets).toHaveLength(1);
    expect(data.tag?.name).toBe('E2E Test');
  });

  it('should fail to create tag link for tag owned by another user', async () => {
    const otherUser = await api.authApi.signUp(signupDto.user1);
    const otherTag = await api.tagsApi.createTag({ name: 'Other' }, { headers: asBearerAuth(otherUser.accessToken) });

    await expect(
      api.sharedLinksApi.createSharedLink(
        { type: SharedLinkType.Tag, tagId: otherTag.id },
        { headers: asBearerAuth(admin.accessToken) }
      )
    ).rejects.toThrow();
  });
});
```

### 4. Frontend Tests

**File:** `web/src/lib/modals/CreateSharedLinkModal.spec.ts`

```typescript
describe('CreateSharedLinkModal - Tag Support', () => {
  it('should show tag picker when tag type selected', async () => {
    const modal = render(CreateSharedLinkModal, { props: { tags: mockTags } });

    await fireEvent.click(modal.getByText('Tag'));

    expect(modal.getByRole('combobox', { name: 'Select Tag' })).toBeInTheDocument();
  });

  it('should create tag-based shared link', async () => {
    const createMock = vi.fn();
    api.createSharedLink = createMock;

    const modal = render(CreateSharedLinkModal, { props: { tags: mockTags } });

    await fireEvent.click(modal.getByText('Tag'));
    await selectTag(modal, mockTags[0]);
    await fireEvent.click(modal.getByText('Create'));

    expect(createMock).toHaveBeenCalledWith({
      type: SharedLinkType.Tag,
      tagId: mockTags[0].id,
    });
  });
});
```

---

## Migration & Rollout

### 1. Database Migration

**Timeline:**
1. Deploy migration to add `tagId` column (non-breaking)
2. Deploy backend code supporting Tag type
3. Deploy frontend with Tag link UI
4. Monitor for issues

**Rollback Plan:**
- Migration is reversible (drop column)
- No data loss (existing links unaffected)
- Feature flag: `ENABLE_TAG_SHARED_LINKS=false` to disable

### 2. Feature Flag (Optional)

**File:** `server/src/config.ts`

```typescript
export interface SystemConfig {
  // ... existing config ...

  features: {
    enableTagSharedLinks: boolean;  // NEW
  };
}
```

**Usage:**
```typescript
async create(auth: AuthDto, dto: SharedLinkCreateDto) {
  if (dto.type === SharedLinkType.Tag) {
    const config = await this.getConfig({ withCache: true });
    if (!config.features.enableTagSharedLinks) {
      throw new BadRequestException('Tag-based shared links are not enabled');
    }
  }
  // ... rest of create logic ...
}
```

### 3. Monitoring

**Metrics to track:**
- Number of tag-based shared links created
- Average assets per tag link
- Query performance (p95, p99 latency)
- Public access rate for tag links
- Error rate for tag link operations

**Alerts:**
- Tag link query timeout > 5s
- Tag link creation failure rate > 5%
- Cascade delete anomalies

### 4. Documentation

**Update:**
- User guide: "How to share photos by tag"
- API documentation: OpenAPI spec (auto-generated)
- Developer docs: Architecture section
- Changelog: "Added tag-based shared links"

---

## Edge Cases & Error Handling

### 1. Empty Tag

**Scenario:** User creates shared link for tag with zero assets

**Behavior:**
- Allow creation (link exists, asset list empty)
- Public viewer shows "No photos in this shared collection"
- When assets are tagged later, they appear automatically

**Implementation:**
```typescript
// In service.create()
const tagAssets = await this.tagRepository.getAssets(dto.tagId);
// Don't reject if empty - allow creation
if (tagAssets.length === 0) {
  this.logger.warn(`Creating shared link for empty tag: ${dto.tagId}`);
}
```

### 2. Tag Deleted

**Scenario:** Tag is deleted while shared link exists

**Behavior:**
- CASCADE delete removes shared link (database constraint)
- Public users get 404 error: "Shared link not found"
- Link owner sees link removed from their list

**Implementation:**
- Database handles CASCADE automatically
- No application code needed

### 3. Asset Permissions Revoked

**Scenario:** User loses permission to share an asset after creating tag link

**Behavior:**
- Link continues to work (consistent with album behavior)
- Assets remain accessible via link
- User should manually delete link if desired

**Rationale:** Immich uses "permission at creation time" model to avoid breaking existing shares

### 4. Hierarchical Tags

**Scenario:** User shares parent tag with child tags

**Current Behavior:** Only assets directly tagged with parent are shared

**Future Enhancement:** Option to "include child tags" in query

**Implementation (Future):**
```typescript
// In repository query
.leftJoin('tag_closure', 'tag_closure.id_ancestor', 'shared_link.tagId')
.whereRef('tag_asset.tagId', '=', 'tag_closure.id_descendant')
// This would include all descendant tags
```

### 5. High Asset Count

**Scenario:** Tag has 50,000+ assets

**Behavior:**
- Query may be slow (5-10s)
- Public viewer pagination required
- Thumbnail generation may lag

**Mitigation:**
```typescript
// Add pagination to public endpoint
async getMine(auth: AuthDto, dto: SharedLinkPasswordDto & { page?: number, limit?: number }) {
  const page = dto.page || 1;
  const limit = Math.min(dto.limit || 100, 1000);
  const offset = (page - 1) * limit;

  // Modify repository query to add LIMIT/OFFSET
}
```

### 6. Special Characters in Tag Names

**Scenario:** Tag name contains `/`, `\`, or Unicode

**Behavior:**
- Database stores UTF-8, no issues
- URL encoding handled by API client
- Web UI renders correctly

**No special handling needed** - existing tag system already supports this

### 7. Concurrent Tag Modifications

**Scenario:** User views shared link while assets are being tagged/untagged

**Behavior:**
- Query returns snapshot at query time
- No inconsistency (PostgreSQL MVCC)
- Refresh shows updated state

**No locking required** - reads are non-blocking

### 8. Tag Renamed

**Scenario:** Tag name/color changes after link creation

**Behavior:**
- Link continues to work (references `tagId`, not name)
- Updated tag metadata shows in responses
- No data migration needed

**Implementation:** Tag metadata fetched dynamically in repository query

### 9. Multiple Links to Same Tag

**Scenario:** User creates 5 shared links for the same tag

**Behavior:**
- All allowed (no uniqueness constraint)
- Each link has unique key/slug
- All dynamically show same assets

**Use case:** Different expiry dates, passwords, or permissions

### 10. Link Type Conversion

**Scenario:** User wants to convert Album link to Tag link

**Behavior:**
- Not supported (by design)
- User must create new link
- Prevents accidental overwrites

**Implementation:** `update()` method doesn't allow changing `type`, `albumId`, or `tagId`

---

## Performance Benchmarks (Estimated)

| Operation | Current (Album) | Tag Links | Notes |
|-----------|-----------------|-----------|-------|
| Create link | 50ms | 70ms | +Tag ownership check + asset permission check |
| Public access (100 assets) | 200ms | 220ms | +Join to tag table |
| Public access (1000 assets) | 800ms | 850ms | Similar to album |
| Public access (10000 assets) | 4s | 4.2s | Pagination recommended |
| Delete link | 10ms | 10ms | Cascade handled by DB |
| List user's links | 150ms | 180ms | +Join to tag table |

**Optimization Targets:**
- Keep tag link queries within 10% of album link queries
- Add pagination if asset count > 1000
- Use database indexes on `tagId` and `tag_asset.tagId`

---

## Alternative Approaches Considered

### Approach 1: Multi-Tag Queries

**Description:** Support sharing multiple tags with AND/OR logic

**Example:**
```typescript
{
  type: SharedLinkType.TagQuery,
  tagQuery: {
    operator: 'AND',
    tagIds: ['tag-1', 'tag-2']
  }
}
```

**Rejected because:**
- Significantly more complex query logic
- Difficult UX (how to express AND/OR in UI?)
- Can be added later as enhancement
- Single-tag sharing covers 90% of use cases

### Approach 2: Smart Albums

**Description:** Create "smart albums" that auto-populate based on tag queries, then share albums

**Rejected because:**
- Requires building entire smart album feature first
- Adds extra abstraction layer
- Slower performance (album + tag query)
- More complex UX

### Approach 3: Tag Collections

**Description:** Create a new entity "TagCollection" separate from shared links

**Rejected because:**
- Duplicates shared link logic
- Inconsistent with existing patterns
- More code to maintain
- No clear benefit over extending SharedLinkType

---

## Future Enhancements

### 1. Include Child Tags Option

```typescript
interface SharedLinkCreateDto {
  // ... existing fields ...
  includeChildTags?: boolean;  // Default false
}
```

Modify repository query to use `tag_closure` table for hierarchical queries.

### 2. Multi-Tag Support

Allow combining multiple tags with AND/OR logic:

```typescript
interface TagQuery {
  operator: 'AND' | 'OR';
  tagIds: string[];
}
```

### 3. Tag-Based Upload

Allow public users to upload photos that automatically get tagged:

```typescript
// When allowUpload === true for tag link
// Uploaded assets automatically receive the tagId
```

### 4. Tag Link Analytics

Track views, downloads, and uploads per tag link:

```typescript
interface SharedLinkResponseDto {
  // ... existing fields ...
  analytics?: {
    views: number;
    downloads: number;
    uploads: number;
  };
}
```

### 5. Shared Tag Subscriptions

Allow public users to "subscribe" to a tag link and get notifications for new assets.

---

## Summary

Tag-based shared links extend Immich's existing shared link architecture with minimal changes and maximum consistency. The implementation:

- **Reuses** existing patterns (similar to album links)
- **Maintains** backward compatibility (no breaking changes)
- **Provides** dynamic asset updates (tag it, share it, forget it)
- **Ensures** security via existing permission system
- **Delivers** performance comparable to album links

The feature is well-scoped, testable, and ready for implementation.
