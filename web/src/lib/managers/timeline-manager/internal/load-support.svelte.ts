import { authManager } from '$lib/managers/auth-manager.svelte';
import { toISOYearMonthUTC } from '$lib/utils/timeline-util';
import { getDynamicAlbumAssets, getTimeBucket } from '@immich/sdk';

import type { MonthGroup } from '../month-group.svelte';
import type { TimelineManager } from '../timeline-manager.svelte';
import type { TimelineManagerOptions } from '../types';
import { layoutMonthGroup } from './layout-support.svelte';

export async function loadFromTimeBuckets(
  timelineManager: TimelineManager,
  monthGroup: MonthGroup,
  options: TimelineManagerOptions,
  signal: AbortSignal,
): Promise<void> {
  if (monthGroup.getFirstAsset()) {
    return;
  }

  const timeBucket = toISOYearMonthUTC(monthGroup.yearMonth);
  const key = authManager.key;

  if (options.dynamicAlbumId) {
    // For dynamic albums, we need to fetch assets and filter by the time bucket
    // Since the backend doesn't support time bucket filtering for dynamic albums yet,
    // we'll fetch assets with pagination and filter by the time bucket
    const timeBucketYear = monthGroup.yearMonth.year;
    const timeBucketMonth = monthGroup.yearMonth.month;
    
    // Calculate the date range for the time bucket
    const startDate = new Date(timeBucketYear, timeBucketMonth - 1, 1);
    const endDate = new Date(timeBucketYear, timeBucketMonth, 0); // Last day of the month
    
    let skip = 0;
    const take = 50; // Fetch in smaller chunks for better performance
    let hasMoreAssets = true;
    let consecutiveEmptyBatches = 0;
    const maxEmptyBatches = 3; // Stop after 3 consecutive empty batches
    let allFilteredAssets: any[] = [];
    
    while (hasMoreAssets && consecutiveEmptyBatches < maxEmptyBatches) {
      const dynamicAlbumAssets = await getDynamicAlbumAssets(
        {
          id: options.dynamicAlbumId,
          skip,
          take,
        },
        { signal },
      );
      
      if (!dynamicAlbumAssets || dynamicAlbumAssets.length === 0) {
        consecutiveEmptyBatches++;
        skip += take;
        continue;
      }
      
      let foundAssetsInBatch = false;
      
      // Filter assets by the current time bucket
      for (const asset of dynamicAlbumAssets) {
        if (asset.fileCreatedAt) {
          const assetDate = new Date(asset.fileCreatedAt);
          
          // Check if the asset is within the time bucket range
          if (assetDate >= startDate && assetDate <= endDate) {
            allFilteredAssets.push(asset);
            foundAssetsInBatch = true;
          }
        }
      }
      
      if (!foundAssetsInBatch) {
        consecutiveEmptyBatches++;
      } else {
        consecutiveEmptyBatches = 0; // Reset counter if we found assets
      }
      
      // If we got fewer assets than requested, we've reached the end
      if (dynamicAlbumAssets.length < take) {
        hasMoreAssets = false;
      } else {
        skip += take;
      }
    }

    // Create a mock bucket response with only the filtered assets
    if (allFilteredAssets.length > 0) {
      const mockBucketResponse = {
        id: allFilteredAssets.map(asset => asset.id),
        ownerId: allFilteredAssets.map(asset => asset.ownerId),
        ratio: allFilteredAssets.map(asset => asset.ratio || 1),
        isFavorite: allFilteredAssets.map(asset => asset.isFavorite || false),
        visibility: allFilteredAssets.map(asset => asset.visibility || 'timeline'),
        isTrashed: allFilteredAssets.map(asset => asset.isTrashed || false),
        isImage: allFilteredAssets.map(asset => asset.type === 'IMAGE'),
        thumbhash: allFilteredAssets.map(asset => asset.thumbhash || null),
        fileCreatedAt: allFilteredAssets.map(asset => asset.fileCreatedAt),
        localOffsetHours: allFilteredAssets.map(asset => asset.localOffsetHours || 0),
        duration: allFilteredAssets.map(asset => asset.duration || null),
        projectionType: allFilteredAssets.map(asset => asset.projectionType || null),
        livePhotoVideoId: allFilteredAssets.map(asset => asset.livePhotoVideoId || null),
        city: allFilteredAssets.map(asset => asset.city || null),
        country: allFilteredAssets.map(asset => asset.country || null),
        stack: allFilteredAssets.map(asset => asset.stack ? [asset.stack.id, asset.stack.assetCount.toString()] : null),
      };

      const unprocessedAssets = monthGroup.addAssets(mockBucketResponse);
      if (unprocessedAssets.length > 0) {
        console.error(
          `Warning: Dynamic album assets not in requested month: ${monthGroup.yearMonth.month}, ${JSON.stringify(
            unprocessedAssets.map((unprocessed) => ({
              id: unprocessed.id,
              localDateTime: unprocessed.localDateTime,
            })),
          )}`,
        );
      }
    }
  } else {
    // Regular timeline fetch for non-dynamic albums
    const bucketResponse = await getTimeBucket(
      {
        ...options,
        timeBucket,
        key,
      },
      { signal },
    );

    if (!bucketResponse) {
      return;
    }

    if (options.timelineAlbumId) {
      const albumAssets = await getTimeBucket(
        {
          albumId: options.timelineAlbumId,
          timeBucket,
          key,
        },
        { signal },
      );
      for (const id of albumAssets.id) {
        timelineManager.albumAssets.add(id);
      }
    }

    const unprocessedAssets = monthGroup.addAssets(bucketResponse);
    if (unprocessedAssets.length > 0) {
      console.error(
        `Warning: getTimeBucket API returning assets not in requested month: ${monthGroup.yearMonth.month}, ${JSON.stringify(
          unprocessedAssets.map((unprocessed) => ({
            id: unprocessed.id,
            localDateTime: unprocessed.localDateTime,
          })),
        )}`,
      );
    }
  }

  layoutMonthGroup(timelineManager, monthGroup);
}
