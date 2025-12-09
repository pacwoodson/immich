# Tag Page Select Action - Implementation Specification

## Overview

Add the `AssetSelectControlBar` component to the tags page to enable bulk actions on selected photos, including common actions and a tag-specific remove action.

## Current State

**File**: `web/src/routes/(user)/tags/[[photos=photos]]/[[assetId=id]]/+page.svelte`

The tags page currently:
- ✅ Has multi-select capability via `AssetInteraction`
- ✅ Loads assets by `tagId` via `TimelineManager`
- ✅ Uses the `Timeline` component with asset selection
- ❌ Does NOT show `AssetSelectControlBar` when assets are selected
- ❌ No bulk actions available on selected assets

## Implementation Plan

### 1. Add AssetSelectControlBar to Tags Page

**Location**: `web/src/routes/(user)/tags/[[photos=photos]]/[[assetId=id]]/+page.svelte`

**Changes**:
- Import `AssetSelectControlBar` component
- Import action components (similar to photos/albums/folders pages)
- Show the control bar conditionally when `assetInteraction.selectionActive` is true
- Pass selected assets and clearSelect callback

**Template Structure**:
```svelte
{#if assetInteraction.selectionActive}
  <AssetSelectControlBar
    assets={assetInteraction.selectedAssets}
    clearSelect={() => assetInteraction.clearSelection()}
  >
    <!-- Action buttons as children -->
  </AssetSelectControlBar>
{/if}
```

### 2. Include Common Photo Actions

Based on other pages (photos, albums, folders), include these standard actions:

| Action Component | Purpose | Import From |
|-----------------|---------|-------------|
| `CreateSharedLink` | Create shared links from selected assets | `@components/shared-components/create-shared-link-modal` |
| `SelectAllAssets` | Select all assets in current view | `@components/timeline/actions/SelectAllAssets.svelte` |
| `FavoriteAction` | Toggle favorite on selected assets | `@components/timeline/actions/FavoriteAction.svelte` |
| `TagAction` | Add tags to selected assets | `@components/timeline/actions/TagAction.svelte` |
| `DownloadAction` | Download selected assets | `@components/timeline/actions/DownloadAction.svelte` |
| `ChangeDate` | Edit date on selected assets | `@components/timeline/actions/ChangeDate.svelte` |
| `ChangeLocation` | Edit location on selected assets | `@components/timeline/actions/ChangeLocation.svelte` |
| `ArchiveAction` | Archive/unarchive selected assets | `@components/timeline/actions/ArchiveAction.svelte` |
| `DeleteAssets` | Delete selected assets | `@components/timeline/actions/DeleteAssets.svelte` |
| `SetVisibilityAction` | Set visibility on selected assets | `@components/timeline/actions/SetVisibilityAction.svelte` |

### 3. Create RemoveTagAction Component

**New File**: `web/src/lib/components/timeline/actions/RemoveTagAction.svelte`

**Purpose**: Remove the currently-viewed tag from selected assets

**Implementation**:
- Use `getAssetControlContext()` to access selected assets and clearSelect
- Accept `tagId` as prop (current tag being viewed)
- On click, call `removeTag({ assetIds, tagIds: [tagId] })` utility
- Emit event or callback to refresh timeline
- Clear selection after success
- Show loading state during operation

**Key Functions**:
- Uses `removeTag()` from `@lib/utils/asset-utils.ts`
- Calls SDK's `untagAssets(id: tagId, bulkIdsDto: { ids: assetIds })`

**Timeline Refresh**:
- After untagging, assets should be removed from the timeline view
- Use `timelineManager.removeAssets(assetIds)` to update UI
- Similar pattern to albums page's `RemoveFromAlbum` action

### 4. Handle Timeline Updates

**Challenge**: When the current tag is removed from assets, they should disappear from the timeline

**Solution**:
- Pass `timelineManager` reference to `RemoveTagAction` component
- After successful `removeTag()` call, invoke `timelineManager.removeAssets(removedAssetIds)`
- This updates the UI without full page reload

**Alternative**:
- Use reactive statements to detect asset changes
- Reload timeline if needed

### 5. Component Integration Pattern

**Example from Albums Page** (reference):
```svelte
{#if assetInteraction.selectionActive}
  <AssetSelectControlBar assets={assetInteraction.selectedAssets} clearSelect={() => assetInteraction.clearSelection()}>
    <CreateSharedLink />
    <SelectAllAssets timelineManager={timelineManager} />
    <FavoriteAction />
    <DownloadAction />
    {#if album.ownerId === $user?.id}
      <RemoveFromAlbum album={album} />
      <DeleteAssets />
    {/if}
  </AssetSelectControlBar>
{/if}
```

**For Tags Page**:
```svelte
{#if assetInteraction.selectionActive && tag}
  <AssetSelectControlBar
    assets={assetInteraction.selectedAssets}
    clearSelect={() => assetInteraction.clearSelection()}
  >
    <CreateSharedLink />
    <SelectAllAssets {timelineManager} />
    <FavoriteAction />
    <TagAction />
    <DownloadAction />
    <ChangeDate />
    <ChangeLocation />
    <ArchiveAction />
    <RemoveTagAction tagId={tag.id} {timelineManager} />
    <DeleteAssets />
    <SetVisibilityAction />
  </AssetSelectControlBar>
{/if}
```

### 6. Visual Considerations

**Positioning**: The control bar should appear:
- At the bottom of the screen (mobile-first)
- Fixed position when scrolling
- Above other UI elements (high z-index)

**Conditional Rendering**:
- Only show when `assetInteraction.selectionActive === true`
- Only show when a tag is selected (`tag` is not null)
- Hide when no assets are selected

### 7. Edge Cases

1. **No tag selected**: Don't show RemoveTagAction button
2. **Empty selection**: Control bar shouldn't show
3. **Asset removal**: Update timeline to remove assets that no longer have the tag
4. **Permission errors**: Handle and show appropriate error messages
5. **Network errors**: Show error toast and maintain selection state

## Files to Modify

1. **web/src/routes/(user)/tags/[[photos=photos]]/[[assetId=id]]/+page.svelte**
   - Add imports for AssetSelectControlBar and action components
   - Add conditional rendering for control bar
   - Pass necessary props to actions

2. **web/src/lib/components/timeline/actions/RemoveTagAction.svelte** (NEW)
   - Create new component for tag removal action
   - Implement tag removal logic
   - Handle timeline updates

## Dependencies

- Existing SDK functions: `untagAssets()`
- Existing utilities: `removeTag()` from `asset-utils.ts`
- Existing components: `AssetSelectControlBar` and action components
- Existing context: `getAssetControlContext()`

## Testing Considerations

1. Verify control bar appears when assets are selected
2. Test each action button works correctly
3. Verify RemoveTagAction removes tag and updates timeline
4. Test edge cases (no tag, empty selection, errors)
5. Check responsive design on mobile and desktop
6. Verify keyboard navigation and accessibility

## Implementation Steps

1. ✅ Create specs.md (this file)
2. ⬜ Create feature branch `feature/tag-page-select-action`
3. ⬜ Create `RemoveTagAction.svelte` component
4. ⬜ Modify tags page to include AssetSelectControlBar
5. ⬜ Add all common action buttons
6. ⬜ Test functionality
7. ⬜ Update status.md with completion notes
8. ⬜ Create pull request

## Success Criteria

- ✅ AssetSelectControlBar appears when assets are selected on tags page
- ✅ All common actions (favorite, download, delete, etc.) work correctly
- ✅ RemoveTagAction button removes current tag from selected assets
- ✅ Timeline updates to reflect removed assets
- ✅ UI matches the experience on photos/albums/folders pages
- ✅ No regressions in existing tag page functionality
