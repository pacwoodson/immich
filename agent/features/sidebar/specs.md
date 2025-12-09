# Sidebar Feature Specification

## Goal
Add the main navigation sidebar to the Folders and Tags pages in addition to their existing page-specific sidebars, creating a dual-sidebar layout.

## Current State

### Folders Page (`/web/src/routes/(user)/folders/...+page.svelte`)
- Uses custom sidebar with folder tree navigation
- Overrides default UserSidebar by providing `{#snippet sidebar()}`
- Shows hierarchical folder structure using TreeItems component

### Tags Page (`/web/src/routes/(user)/tags/...+page.svelte`)
- Uses custom sidebar with tag tree navigation
- Overrides default UserSidebar by providing `{#snippet sidebar()}`
- Shows hierarchical tag structure using TreeItems component

### Main Navigation Sidebar (`UserSidebar`)
- Provides primary navigation: Photos, Explore, Albums, Tags, Folders, etc.
- Used by default in UserPageLayout when no custom sidebar snippet is provided
- Width: 64px on desktop (sidebar:w-64)

## Proposed Solution

### Approach: Dual-Sidebar Layout

Create a layout that shows both sidebars side-by-side:
1. **Left sidebar**: Main navigation (UserSidebar) - always visible
2. **Right sidebar**: Page-specific content (folder/tag tree) - contextual

### Implementation Steps

#### 1. Update UserPageLayout Component
**File**: `/web/src/lib/components/layouts/user-page-layout.svelte`

Modify to support dual-sidebar mode:
- Add new prop: `secondarySidebar?: Snippet`
- Rename current `sidebar` prop to clarify it's the primary sidebar
- Update grid layout to support dual sidebars: `grid-cols-[64px_64px_auto]` on desktop
- When `secondarySidebar` is provided, render both UserSidebar and the secondary sidebar

**Alternative approach**: Keep current API and detect dual-sidebar intent differently
- Could check if `sidebar` content should be supplemental vs replacement
- This maintains backward compatibility with existing pages

#### 2. Update Folders Page
**File**: `/web/src/routes/(user)/folders/...+page.svelte`

- Change from `{#snippet sidebar()}` to `{#snippet secondarySidebar()}` (or similar)
- Let UserPageLayout render UserSidebar by default
- The folder tree becomes the secondary sidebar

#### 3. Update Tags Page
**File**: `/web/src/routes/(user)/tags/...+page.svelte`

- Change from `{#snippet sidebar()}` to `{#snippet secondarySidebar()}` (or similar)
- Let UserPageLayout render UserSidebar by default
- The tag tree becomes the secondary sidebar

#### 4. Styling Considerations

- **Desktop**: Both sidebars visible side-by-side (128px total width)
- **Mobile**:
  - Option A: Stack sidebars (main nav on top, then page-specific)
  - Option B: Toggle between sidebars with tabs/buttons
  - Option C: Only show page-specific sidebar on mobile (space constrained)

- **Grid layout**: Update CSS to accommodate dual columns
  - Current: `grid-cols-[0_auto] sidebar:grid-cols-[64px_auto]`
  - New: `grid-cols-[0_0_auto] sidebar:grid-cols-[64px_64px_auto]`

#### 5. Responsive Behavior

- Sidebar store manages open/close state
- On mobile, consider which sidebar(s) to show
- Maintain accessibility (focus trap, keyboard navigation)

## Technical Details

### Components to Modify
1. `/web/src/lib/components/layouts/user-page-layout.svelte` - Add dual-sidebar support
2. `/web/src/routes/(user)/folders/[[photos=photos]]/[[assetId=id]]/+page.svelte` - Use new API
3. `/web/src/routes/(user)/tags/[[photos=photos]]/[[assetId=id]]/+page.svelte` - Use new API

### Components to Consider
- `/web/src/lib/components/sidebar/sidebar.svelte` - Base container, may need width adjustments
- `/web/src/lib/stores/sidebar.svelte` - State management, may need dual-sidebar state

### CSS Grid Strategy
```
Before (single sidebar):
grid-cols-[0_auto] sidebar:grid-cols-[64px_auto]
     [sidebar] [content]

After (dual sidebar):
grid-cols-[0_0_auto] sidebar:grid-cols-[64px_64px_auto]
     [main-nav] [page-nav] [content]
```

## Edge Cases & Considerations

1. **Mobile UX**: Two sidebars may be too crowded on mobile
   - Recommend: Only show page-specific sidebar on mobile, main nav in app bar

2. **Navigation consistency**: Users should still be able to navigate to other sections from folders/tags pages
   - This is the whole point of adding UserSidebar back

3. **Visual separation**: Need clear distinction between main nav and page nav
   - Consider border or background color difference

4. **Accessibility**: Ensure keyboard navigation works across both sidebars
   - Tab order should be logical
   - Skip links should work correctly

## Testing Checklist

- [ ] Desktop: Both sidebars visible on folders page
- [ ] Desktop: Both sidebars visible on tags page
- [ ] Mobile: Appropriate sidebar behavior (to be decided)
- [ ] Navigation: All UserSidebar links work from folders/tags pages
- [ ] Responsive: Layout adapts correctly at breakpoints
- [ ] Accessibility: Keyboard navigation works
- [ ] Visual: Clear distinction between sidebars

## Open Questions

1. **Mobile behavior**: Which approach for mobile dual-sidebar?
2. **Sidebar width**: Keep both at 64px or adjust secondary to be wider for tree content?
3. **Visual styling**: How to distinguish the two sidebars visually?
