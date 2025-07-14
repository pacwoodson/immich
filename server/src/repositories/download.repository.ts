import { Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/schema';
import { anyUuid, searchAssetBuilder } from 'src/utils/database';
import { FilterUtil } from 'src/utils/filter.util';

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
    // Convert filters to search options using the centralized utility
    const searchOptions = FilterUtil.convertFiltersToSearchOptions(filters, userId);

    // Use searchAssetBuilder to create the query and then add the download-specific fields
    return searchAssetBuilder(this.db, searchOptions)
      .innerJoin('exif', 'assets.id', 'exif.assetId')
      .select(['assets.id', 'assets.livePhotoVideoId', 'exif.fileSizeInByte as size'])
      .stream();
  }

  downloadUserId(userId: string) {
    return builder(this.db).where('assets.ownerId', '=', userId).stream();
  }
}
