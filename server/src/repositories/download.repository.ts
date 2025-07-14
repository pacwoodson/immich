import { Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { AssetVisibility } from 'src/enum';
import { DB } from 'src/schema';
import { anyUuid, searchAssetBuilder } from 'src/utils/database';

const builder = (db: Kysely<DB>) =>
  db
    .selectFrom('assets')
    .innerJoin('exif', 'assetId', 'id')
    .select(['assets.id', 'assets.livePhotoVideoId', 'exif.fileSizeInByte as size'])
    .where('assets.deletedAt', 'is', null);

@Injectable()
export class DownloadRepository {
  constructor(@InjectKysely() private db: Kysely<DB>) {}

  downloadAssetIds(ids: string[]) {
    return builder(this.db).where('assets.id', '=', anyUuid(ids)).stream();
  }

  downloadMotionAssetIds(ids: string[]) {
    return builder(this.db).select(['assets.originalPath']).where('assets.id', '=', anyUuid(ids)).stream();
  }

  downloadAlbumId(albumId: string, isDynamic: boolean = false, filters?: any, userId?: string) {
    // For dynamic albums, use search functionality
    if (isDynamic && filters && userId) {
      return this.downloadDynamicAlbum(filters, userId);
    }

    // For regular albums, use the existing logic
    return builder(this.db)
      .innerJoin('albums_assets_assets', 'assets.id', 'albums_assets_assets.assetsId')
      .where('albums_assets_assets.albumsId', '=', albumId)
      .stream();
  }

  private downloadDynamicAlbum(filters: any, userId: string) {
    // Convert filters to search options (similar to AlbumService.convertFiltersToSearchOptions)
    const searchOptions: any = {
      userIds: [userId],
      withDeleted: false,
    };

    // Handle the actual filter structure: {tags: [...], operator: "and", ...}
    if (filters.tags && Array.isArray(filters.tags)) {
      searchOptions.tagIds = filters.tags;
      // Include the operator for tag filtering
      if (filters.operator) {
        searchOptions.tagOperator = filters.operator;
      }
    }

    if (filters.people && Array.isArray(filters.people)) {
      searchOptions.personIds = filters.people;
    }

    if (filters.location) {
      if (typeof filters.location === 'string') {
        searchOptions.city = filters.location;
      } else if (typeof filters.location === 'object') {
        if (filters.location.city) searchOptions.city = filters.location.city;
        if (filters.location.state) searchOptions.state = filters.location.state;
        if (filters.location.country) searchOptions.country = filters.location.country;
      }
    }

    if (filters.dateRange && typeof filters.dateRange === 'object') {
      if (filters.dateRange.start) {
        searchOptions.takenAfter = new Date(filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        searchOptions.takenBefore = new Date(filters.dateRange.end);
      }
    }

    if (filters.assetType) {
      if (filters.assetType === 'IMAGE' || filters.assetType === 'VIDEO') {
        searchOptions.type = filters.assetType;
      }
    }

    if (filters.metadata && typeof filters.metadata === 'object') {
      if (filters.metadata.isFavorite !== undefined) {
        searchOptions.isFavorite = filters.metadata.isFavorite;
      }
      if (filters.metadata.make) searchOptions.make = filters.metadata.make;
      if (filters.metadata.model) searchOptions.model = filters.metadata.model;
      if (filters.metadata.lensModel) searchOptions.lensModel = filters.metadata.lensModel;
      if (filters.metadata.rating !== undefined) searchOptions.rating = filters.metadata.rating;
    }

    // Use searchAssetBuilder to create the query and then add the download-specific fields
    return searchAssetBuilder(this.db, searchOptions)
      .innerJoin('exif', 'assets.id', 'exif.assetId')
      .select(['assets.id', 'assets.livePhotoVideoId', 'exif.fileSizeInByte as size'])
      .stream();
  }

  downloadUserId(userId: string) {
    return builder(this.db)
      .where('assets.ownerId', '=', userId)
      .where('assets.visibility', '!=', AssetVisibility.HIDDEN)
      .stream();
  }
}
