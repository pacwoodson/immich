# Tag-Based Shared Links - Feature Review

**Review Date:** 2025-12-09
**Reviewer:** Feature Reviewer Agent
**Branch:** feature/tag-based-shared-links
**Status:** ⚠️ **BLOCKED - Critical Issues Found**

---

## Executive Summary

The tag-based shared links feature has been partially implemented with good architectural decisions and code structure. However, **the server code does not compile** due to several critical type and method signature errors. The web frontend builds successfully and the implementation looks good. An estimated **2-4 hours of fixes** are needed before this feature can be tested.

**Overall Completion:** ~70%
- Backend Schema/DTOs: ✅ 95% complete
- Backend Service Logic: ⚠️ 60% complete (has critical errors)
- Backend Repository: ✅ 95% complete
- Web UI: ⚠️ 80% complete (missing share button on tags page)
- Testing: ❌ 0% complete
- Documentation: ❌ 0% complete

---

## Critical Issues (Must Fix Before Testing)

### 🚨 Issue 1: Missing Type Definitions in database.ts
**File:** `server/src/database.ts:177-193`
**Severity:** Critical - Blocks compilation

**Problem:**
The `SharedLink` type is missing `tag` and `tagId` fields:

```typescript
export type SharedLink = {
  id: string;
  album?: Album | null;
  albumId: string | null;
  // ❌ MISSING: tag?: Tag | null;
  // ❌ MISSING: tagId: string | null;
  allowDownload: boolean;
  // ... rest of fields
};
```

**Impact:**
- DTO mapper at `shared-link.dto.ts:160` fails: `Property 'tag' does not exist on type 'SharedLink'`
- Repository queries return tag data but type system doesn't recognize it

**Fix Required:**
Add missing fields to the SharedLink type:
```typescript
export type SharedLink = {
  id: string;
  album?: Album | null;
  albumId: string | null;
  tag?: Tag | null;          // ADD THIS
  tagId: string | null;      // ADD THIS
  allowDownload: boolean;
  // ... rest
};
```

**Also check:** The `Tag` type should be imported/defined if not already present.

---

### 🚨 Issue 2: Incorrect tagRepository.get() Method Call
**File:** `server/src/services/shared-link.service.ts:73`
**Severity:** Critical - Blocks compilation

**Problem:**
```typescript
const tag = await this.tagRepository.get(auth.user.id, dto.tagId);
//                                        ^^^^^^^^^^^^^^  ❌ Wrong!
```

The `tagRepository.get()` method only takes one parameter (id), not (userId, id):
```typescript
// Actual signature in tag.repository.ts:21
get(id: string) {
  return this.db.selectFrom('tag').select(columns.tag).where('id', '=', id).executeTakeFirst();
}
```

**Fix Required:**
```typescript
const tag = await this.tagRepository.get(dto.tagId);
if (!tag) {
  throw new BadRequestException('Tag not found');
}
// Then verify ownership separately:
if (tag.userId !== auth.user.id) {
  throw new BadRequestException('Access denied - you do not own this tag');
}
```

---

### 🚨 Issue 3: Method tagRepository.getAssets() Does Not Exist
**File:** `server/src/services/shared-link.service.ts:79`
**Severity:** Critical - Blocks compilation

**Problem:**
```typescript
const tagAssets = await this.tagRepository.getAssets(auth.user.id, dto.tagId);
//                                         ~~~~~~~~~  ❌ This method doesn't exist!
```

**Available method:**
`tagRepository.getAssetIds(tagId, assetIds)` exists but requires you to pass assetIds to check.

**Fix Options:**

**Option A - Query tag_asset directly (recommended):**
```typescript
// Get all asset IDs for this tag
const tagAssetRecords = await this.db
  .selectFrom('tag_asset')
  .select('assetId')
  .where('tagId', '=', dto.tagId)
  .execute();

const assetIds = tagAssetRecords.map(r => r.assetId);

if (assetIds.length > 0) {
  await this.requireAccess({ auth, permission: Permission.AssetShare, ids: assetIds });
}
```

**Option B - Add getAssets() method to TagRepository:**
```typescript
// In tag.repository.ts, add:
@GenerateSql({ params: [DummyValue.UUID] })
async getAssets(tagId: string) {
  return this.db
    .selectFrom('tag_asset')
    .innerJoin('asset', 'asset.id', 'tag_asset.assetId')
    .selectAll('asset')
    .where('tag_asset.tagId', '=', tagId)
    .where('asset.deletedAt', 'is', null)
    .execute();
}
```

**Recommendation:** Use Option A (direct query in service) to avoid adding repository methods that aren't reusable. The service only needs asset IDs for permission checking.

---

## Major Issues (Functionality Incomplete)

### ⚠️ Issue 4: Missing Share Button on Tags Page
**Expected Location:** `web/src/routes/(user)/tags/[[photos=photos]]/[[assetId=id]]/+page.svelte`
**Severity:** Major - Feature unusable without UI entry point

**Problem:**
The specs (section 1.1) require adding a "Share" button to the tag detail view, but this hasn't been implemented. Users have no way to create tag-based shared links from the tags page.

**Fix Required:**
Add a share button to the tag page toolbar similar to album sharing:
1. Import `SharedLinkCreateModal`
2. Add share icon/button to tag page header
3. Open modal with `tagId` prop when clicked
4. Handle success callback to show notification

**Code Example:**
```svelte
<script lang="ts">
  import SharedLinkCreateModal from '$lib/modals/SharedLinkCreateModal.svelte';
  import { mdiShareVariant } from '@mdi/js';

  let showShareModal = $state(false);
  let selectedTag = $state<TagResponseDto>();

  function handleShare() {
    showShareModal = true;
  }
</script>

<!-- Add to toolbar -->
<button onclick={handleShare}>
  <Icon path={mdiShareVariant} />
  Share Tag
</button>

{#if showShareModal}
  <SharedLinkCreateModal
    tagId={selectedTag?.id}
    onClose={() => showShareModal = false}
  />
{/if}
```

---

### ⚠️ Issue 5: Public Link Viewer Not Verified for Tags
**Files:** `web/src/routes/(user)/share/[key]/+page.svelte` or similar
**Severity:** Major - User experience incomplete

**Problem:**
The specs (section 1.4) mention adding a visual indicator that a shared link is tag-based, but it's unclear if this has been implemented. The public viewer should show:
- Tag name with color badge
- Message like "Photos tagged with [tag name]"
- Dynamic asset list

**Verification Needed:**
1. Check if public link viewer displays tag information
2. Verify tag color is shown
3. Test that tagged assets appear correctly
4. Test empty tag scenario

**Likely File:** `web/src/routes/(user)/share/[key]/+page.svelte` or a link viewer component

---

## Minor Issues

### ℹ️ Issue 6: No Tests Written
**Severity:** Minor - Not blocking but required before merge

All test phases (Phase 4) are incomplete:
- [ ] Unit tests for service methods
- [ ] Integration tests for dynamic asset behavior
- [ ] E2E tests for API endpoints

**Recommendation:** Write tests after fixing critical issues above.

---

### ℹ️ Issue 7: Error Message Could Be More Specific
**File:** `server/src/services/shared-link.service.ts:75`
**Severity:** Minor - UX improvement

Current error:
```typescript
throw new BadRequestException('Tag not found or access denied');
```

Better approach:
```typescript
if (!tag) {
  throw new BadRequestException('Tag not found');
}
if (tag.userId !== auth.user.id) {
  throw new ForbiddenException('You do not have permission to share this tag');
}
```

Helps with debugging and user clarity.

---

## Positive Findings ✅

### ✅ Excellent: Database Migration
**File:** `server/src/schema/migrations/1733740000000-AddTagIdToSharedLink.ts`

The migration is well-structured:
- Adds nullable `tagId` column (backward compatible)
- Creates foreign key with CASCADE delete (correct behavior)
- Adds index for query performance
- Includes reversible `down()` migration

**No changes needed.**

---

### ✅ Good: Repository Implementation
**File:** `server/src/repositories/shared-link.repository.ts`

The repository queries are well-implemented:
- Lateral joins for tag assets (lines 111-153)
- Proper aggregation with `jsonAgg()`
- Includes EXIF data for assets
- Filters deleted assets
- `authBuilder()` updated to support tag links (lines 260-278)

**Minor suggestion:** Consider adding a comment explaining the lateral join logic for maintainability.

---

### ✅ Good: Web Component Updates
**Files:**
- `web/src/lib/components/sharedlinks-page/shared-link-card.svelte`
- `web/src/lib/modals/SharedLinkCreateModal.svelte`

Both components properly handle the tag type:
- Display tag name with color badge
- Show appropriate icons
- Modal accepts `tagId` prop
- Type derivation logic is clean

**No changes needed.**

---

### ✅ Good: Schema and Enum Updates
**Files:**
- `server/src/schema/tables/shared-link.table.ts`
- `server/src/enum.ts`

Both files correctly add:
- `SharedLinkType.Tag` enum value with documentation
- `tagId` foreign key column with CASCADE delete
- Proper TypeScript types

**No changes needed.**

---

## Architecture Review

### Strengths
1. **Consistent with existing patterns** - Tag links follow the same structure as Album links
2. **Dynamic asset fetching** - Repository correctly queries `tag_asset` junction table
3. **Permission model** - Properly checks tag ownership and asset share permissions
4. **Cascade delete** - Database constraint ensures orphaned links are cleaned up
5. **Type safety** - Uses TypeScript and Kysely for compile-time checks (once errors are fixed)

### Potential Concerns
1. **Performance with large tags** - A tag with 10,000+ assets will have slow queries
   - **Mitigation:** Add pagination to public viewer (future enhancement)
   - **Mitigation:** Repository uses indexes and optimized joins

2. **Permission checking on create** - Checking all tagged assets on link creation could be slow
   - **Current approach:** Acceptable for MVP, checks all assets upfront
   - **Alternative:** Defer permission checks to access time (trade-off: security vs. performance)

3. **No hierarchical tag support yet** - Child tags aren't included
   - **Current behavior:** Only directly tagged assets are shared
   - **Future enhancement:** Add `includeChildTags` option (documented in specs)

---

## Recommendations

### Immediate Actions (Before Testing)
1. **Fix Critical Issue #1** - Add `tag` and `tagId` to SharedLink type definition
2. **Fix Critical Issue #2** - Correct tagRepository.get() call and add ownership check
3. **Fix Critical Issue #3** - Implement asset ID fetching for permission checks
4. **Fix Major Issue #4** - Add share button to tags page
5. **Verify Issue #5** - Test public link viewer with tag links

**Estimated time:** 2-4 hours

### After Fixes (Before Merge)
1. Run `make build-server` and verify no compilation errors
2. Run `make build-web` and verify no errors
3. Manual testing:
   - Create tag-based shared link
   - Access public link (with/without password)
   - Verify dynamic behavior (tag new asset, verify it appears)
   - Test cascade delete (delete tag, verify link deleted)
4. Write basic unit tests for service methods
5. Write at least one E2E test for tag link creation

**Estimated time:** 6-8 hours

### Before Production
1. Complete all tests (Phase 4)
2. Add user documentation
3. Update API documentation (OpenAPI already regenerated)
4. Performance testing with large tags (1000+ assets)
5. Security review of permission checks

---

## Compliance with Specs

| Spec Section | Status | Notes |
|--------------|--------|-------|
| Database Schema (Phase 1) | ✅ 95% | Migration correct, type def missing |
| Backend Logic (Phase 2) | ⚠️ 60% | Service has critical errors |
| Repository Queries (Phase 2) | ✅ 95% | Well-implemented |
| API/OpenAPI (Phase 3) | ✅ 100% | Specs regenerated correctly |
| Web Components (Phase 5) | ✅ 90% | Components good, missing share button |
| Public Viewer (Phase 5) | ❓ Unknown | Needs verification |
| Testing (Phase 4) | ❌ 0% | Not started |
| Mobile (Phase 6) | ❌ 0% | Not started (out of scope) |
| Documentation (Phase 7) | ❌ 0% | Not started |

---

## Code Quality Assessment

### Positive
- Clean, readable code
- Follows Immich architectural patterns
- Good use of TypeScript types
- Proper error handling structure
- Kysely queries are well-formed

### Needs Improvement
- Type definitions incomplete (critical)
- Method signatures incorrect (critical)
- Missing UI entry point (major)
- No tests yet (expected at this stage)
- Some error messages could be more specific

**Overall Code Quality:** Good architecture, but critical bugs prevent compilation.

---

## Security Review

### ✅ Permission Checks Are Correct (Once Fixed)
- Tag ownership verified
- Asset share permissions checked
- Existing permission system reused

### ✅ Database Security
- Foreign key constraints prevent orphaned references
- CASCADE delete ensures cleanup
- No SQL injection risk (using Kysely query builder)

### ⚠️ Potential Issue: Stale Permissions
If a user shares a tag, then loses permission to share some tagged assets, the link continues to work. This is **consistent with album behavior** and is acceptable, but should be documented.

**Recommendation:** Add a note in user documentation that permissions are checked at link creation time.

---

## Performance Review

### Query Complexity
- Tag link queries are O(n) where n = number of tagged assets
- Similar to album queries (no worse performance)
- Indexes are in place (`shared_link_tagId_idx`, `tag_asset_tagId_idx`)

### Potential Bottlenecks
1. **Large tag queries** - 10,000+ assets could be slow
   - Solution: Add pagination (future enhancement)
2. **Permission checking** - Checking 1000+ assets on create
   - Acceptable for MVP, could optimize later with batch checks

**Recommendation:** Add TODO comment for pagination if tag has >1000 assets.

---

## Final Verdict

**Status:** ⚠️ **NOT READY FOR TESTING**

**Blockers:**
1. Server code does not compile (3 critical TypeScript errors)
2. Missing UI entry point (share button)

**Action Required:**
Fix 3 critical issues and 1 major issue, then re-test.

**Estimated Time to Ready:** 2-4 hours for a developer familiar with the codebase.

**After Fixes:** Feature will be in good shape for testing and integration.

---

## Next Steps

1. ✅ Fix critical issues #1-3 (type definitions and method calls)
2. ✅ Add share button to tags page (issue #4)
3. ✅ Verify public link viewer displays tags correctly (issue #5)
4. ⏳ Build and test manually
5. ⏳ Write basic tests
6. ⏳ Code review with team
7. ⏳ Merge to agent-dev

---

**Review completed by:** Feature Reviewer Agent
**Date:** 2025-12-09
**Confidence Level:** High (direct code inspection and compilation testing)
