# Tag-Based Shared Links

## Overview

This feature enables users to create shared links that dynamically display all assets tagged with a specific tag. Similar to how album shared links work (where adding photos to an album automatically updates the shared link), tag-based shared links will automatically include any newly tagged assets.

## User Problem

Currently, Immich supports two types of shared links:
1. **Album Links** - Share all assets in an album (dynamic - updates when album changes)
2. **Individual Links** - Share specific selected assets (static - requires manual updates)

However, users cannot create shared links based on tags. If a user wants to share "all photos with the 'Vacation' tag" or "all photos tagged 'Family'", they must either:
- Create an album and manually keep it in sync with their tags
- Create an individual link and manually add/remove assets as tags change

This is cumbersome for users who organize their photos by tags and want to share dynamic collections based on tag criteria.

## Proposed Solution

Add a third shared link type: **Tag Links** (`SharedLinkType.Tag`)

- Users can create a shared link for any tag they own
- The link dynamically fetches all assets with that tag at access time
- When assets are tagged, they automatically appear in the link
- When assets are untagged, they disappear from the link
- Works with hierarchical tags (optional: include child tags in the query)

## User Stories

### Story 1: Travel Photographer
> "As a travel photographer, I want to share all photos tagged 'Iceland 2025' with my clients without creating a separate album. When I add more photos and tag them 'Iceland 2025', the shared link should automatically include them."

### Story 2: Event Organizer
> "As an event organizer, I tag all photos from our company retreat with 'Company Events'. I want to create a shared link for this tag so team members can always see the latest event photos without me having to update an album."

### Story 3: Family Member
> "As a parent, I tag all photos of my daughter with her name. I want my relatives to have a shared link that always shows her latest photos automatically."

## Use Cases

1. **Dynamic Collections** - Share evolving photo collections organized by tag
2. **Workflow Efficiency** - Avoid duplicate organization (no need for both tags and albums)
3. **Automated Sharing** - "Tag it and forget it" - new assets appear automatically
4. **Hierarchical Sharing** - Share parent tag to include all child-tagged photos
5. **Event-Based Sharing** - Share photos from recurring events (e.g., all "Monthly Meetup" tagged photos)

## Expected Behavior

- Creating a tag-based shared link stores only the `tagId`
- Accessing the link queries the current state of the `tag_asset` junction table
- All existing shared link features work: password protection, expiration, permissions, etc.
- Deleting the tag removes associated shared links (CASCADE delete)
- If all assets with the tag are deleted, the link shows an empty collection (not an error)

## Benefits

- **Consistency** - Works like album links (familiar mental model)
- **Flexibility** - Users can organize by tags OR albums OR both
- **Automation** - Reduces manual maintenance of shared collections
- **Performance** - Direct database query, no intermediate abstraction layer

## Out of Scope (Future Enhancements)

- Multi-tag queries (e.g., "photos with tag A AND tag B")
- Tag exclusion queries (e.g., "tag A but NOT tag B")
- Smart albums with complex tag-based rules
- Sharing tags publicly (vs sharing tagged assets)
