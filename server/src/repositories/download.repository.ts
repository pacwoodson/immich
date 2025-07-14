import { Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/schema';
import { DynamicAlbumFilters } from 'src/types/dynamic-album.types';
import { anyUuid, convertDynamicAlbumFiltersToSearchOptions, searchAssetBuilder } from 'src/utils/database';

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

  downloadAssetPaths(ids: string[]) {
    return builder(this.db).select(['assets.originalPath']).where('assets.id', '=', anyUuid(ids)).stream();
  }

  downloadAlbumId(albumId: string) {
    // For regular albums, use the existing logic
    return builder(this.db)
      .innerJoin('albums_assets_assets', 'assets.id', 'albums_assets_assets.assetsId')
      .where('albums_assets_assets.albumsId', '=', albumId)
      .stream();
  }

  /**
   * Download assets based on search options (used for dynamic albums)
   * @param searchOptions Search options for filtering assets
   * @returns Stream of assets with download information
   */
  downloadSearchResults(searchOptions: any) {
    return searchAssetBuilder(this.db, searchOptions)
      .innerJoin('exif', 'assets.id', 'exif.assetId')
      .select(['assets.id', 'assets.livePhotoVideoId', 'exif.fileSizeInByte as size'])
      .stream();
  }

  /**
   * Download assets for a dynamic album by converting filters to search options
   * @param filters Dynamic album filters
   * @param userId User ID for filtering
   * @returns Stream of assets with download information
   */
  downloadDynamicAlbum(filters: DynamicAlbumFilters, userId: string) {
    const searchOptions = convertDynamicAlbumFiltersToSearchOptions(filters, userId);
    return this.downloadSearchResults(searchOptions);
  }

  downloadUserId(userId: string) {
    return builder(this.db).where('assets.ownerId', '=', userId).stream();
  }
}
