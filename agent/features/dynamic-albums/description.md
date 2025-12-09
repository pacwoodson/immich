# Dynamic Albums Feature

## Overview

Dynamic Albums (also known as Smart Albums) are albums that automatically populate with assets based on user-defined filters, rather than manually selecting individual assets. The assets in a dynamic album are computed in real-time based on the current state of the user's library.

## Purpose

Traditional albums in Immich require users to manually add and remove assets. Dynamic Albums solve this by allowing users to define criteria (tags, people, locations, dates, metadata) that automatically determine which assets belong to the album. This makes it easier to:

- Organize photos by tags without manual curation
- Create albums for specific people, locations, or time periods
- Maintain albums that automatically include new matching assets
- Build complex queries using multiple filter criteria with AND/OR logic

## Key Concepts

### Static vs Dynamic

- **Static Albums**: Traditional albums where assets are explicitly added/removed by the user
- **Dynamic Albums**: Albums where membership is determined by filters; assets cannot be manually added/removed

### Filters

Dynamic albums use a flexible filter system supporting:

- **Tags**: Include assets with specific tags (with AND/OR logic)
- **People**: Include assets containing specific people
- **Location**: Filter by city, state, country, or free-text location
- **Date Range**: Include assets within a specific date range
- **Asset Type**: Filter by IMAGE or VIDEO
- **Metadata**: Filter by camera make/model, lens, rating, favorite status

### Operator Logic

Filters can be combined using:

- **AND**: All specified criteria must match (more restrictive)
- **OR**: Any specified criteria can match (more permissive)

## User Stories

1. **As a photographer**, I want to create an album of all photos taken with my Sony A7III so I can showcase work from that camera
2. **As a parent**, I want an album that automatically includes all photos of my children so I don't have to manually add them
3. **As a traveler**, I want albums for each country I've visited that auto-populate from location data
4. **As an organizer**, I want to combine multiple tags (e.g., "vacation" AND "2024") to create specific collections
5. **As a mobile user**, I want to view and sync dynamic albums on my phone just like regular albums

## Scope

### In Scope

- Creating dynamic albums with filter criteria
- Viewing dynamic albums (web and mobile)
- Editing filter criteria for existing dynamic albums
- Sharing dynamic albums via shared links
- Syncing dynamic album state to mobile devices
- Timeline and map views for dynamic albums
- Downloading assets from dynamic albums
