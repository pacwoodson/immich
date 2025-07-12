import { Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { AssetVisibility } from 'src/enum';
import { DynamicAlbumFilterRepository } from 'src/repositories/dynamic-album-filter.repository';
import { DynamicAlbumRepository } from 'src/repositories/dynamic-album.repository';
import { DB } from 'src/schema';
import { anyUuid } from 'src/utils/database';
import { buildDynamicAlbumAssetQuery, DynamicAlbumFilter } from 'src/utils/dynamic-album-filter';

const builder = (db: Kysely<DB>) =>
  db
    .selectFrom('assets')
    .innerJoin('exif', 'assetId', 'id')
    .select(['assets.id', 'assets.livePhotoVideoId', 'exif.fileSizeInByte as size'])
    .where('assets.deletedAt', 'is', null);

@Injectable()
export class DownloadRepository {
  constructor(
    @InjectKysely() private db: Kysely<DB>,
    private dynamicAlbumFilterRepository: DynamicAlbumFilterRepository,
    private dynamicAlbumRepository: DynamicAlbumRepository,
  ) {}

  downloadAssetIds(ids: string[]) {
    return builder(this.db).where('assets.id', '=', anyUuid(ids)).stream();
  }

  downloadMotionAssetIds(ids: string[]) {
    return builder(this.db).select(['assets.originalPath']).where('assets.id', '=', anyUuid(ids)).stream();
  }

  downloadAlbumId(albumId: string) {
    return builder(this.db)
      .innerJoin('albums_assets_assets', 'assets.id', 'albums_assets_assets.assetsId')
      .where('albums_assets_assets.albumsId', '=', albumId)
      .stream();
  }

  async downloadDynamicAlbumId(dynamicAlbumId: string) {
    const album = await this.dynamicAlbumRepository.getById(dynamicAlbumId);
    if (!album) {
      throw new Error('Dynamic album not found');
    }

    const filters = await this.dynamicAlbumFilterRepository.getByDynamicAlbumId(dynamicAlbumId);
    const dynamicFilters: DynamicAlbumFilter[] = filters.map((filter) => ({
      type: filter.filterType,
      value: filter.filterValue,
    }));

    // Use the same query builder as the dynamic album repository
    const query = buildDynamicAlbumAssetQuery(this.db, dynamicFilters, {
      userId: album.ownerId,
      skip: undefined,
      take: undefined,
      order: 'desc',
    });

    // Convert the query to a stream format compatible with the download system
    return query
      .select(['assets.id', 'assets.livePhotoVideoId'])
      .innerJoin('exif', 'assets.id', 'exif.assetId')
      .select(['exif.fileSizeInByte as size'])
      .stream();
  }

  downloadUserId(userId: string) {
    return builder(this.db)
      .where('assets.ownerId', '=', userId)
      .where('assets.visibility', '!=', AssetVisibility.HIDDEN)
      .stream();
  }
}
