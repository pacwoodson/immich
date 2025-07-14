import { Injectable } from '@nestjs/common';
import { Kysely, SelectQueryBuilder, sql } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { columns } from 'src/database';
import { DummyValue, GenerateSql } from 'src/decorators';
import { AlbumRepository } from 'src/repositories/album.repository';
import { SearchRepository } from 'src/repositories/search.repository';
import { DB } from 'src/schema';
import { SyncAck } from 'src/types';
import { FilterUtil } from 'src/utils/filter.util';

type AuditTables =
  | 'users_audit'
  | 'partners_audit'
  | 'assets_audit'
  | 'albums_audit'
  | 'album_users_audit'
  | 'album_assets_audit'
  | 'memories_audit'
  | 'memory_assets_audit'
  | 'stacks_audit';
type UpsertTables =
  | 'users'
  | 'partners'
  | 'assets'
  | 'exif'
  | 'albums'
  | 'albums_shared_users_users'
  | 'memories'
  | 'memories_assets_assets'
  | 'asset_stack';

@Injectable()
export class SyncRepository {
  album: AlbumSync;
  albumAsset: AlbumAssetSync;
  albumAssetExif: AlbumAssetExifSync;
  albumToAsset: AlbumToAssetSync;
  albumUser: AlbumUserSync;
  asset: AssetSync;
  assetExif: AssetExifSync;
  memory: MemorySync;
  memoryToAsset: MemoryToAssetSync;
  partner: PartnerSync;
  partnerAsset: PartnerAssetsSync;
  partnerAssetExif: PartnerAssetExifsSync;
  partnerStack: PartnerStackSync;
  stack: StackSync;
  user: UserSync;

  constructor(
    @InjectKysely() private db: Kysely<DB>,
    private searchRepository: SearchRepository,
    private albumRepository: AlbumRepository,
  ) {
    this.album = new AlbumSync(this.db);
    this.albumAsset = new AlbumAssetSync(this.db, this.searchRepository, this.albumRepository);
    this.albumAssetExif = new AlbumAssetExifSync(this.db, this.searchRepository, this.albumRepository);
    this.albumToAsset = new AlbumToAssetSync(this.db, this.searchRepository, this.albumRepository);
    this.albumUser = new AlbumUserSync(this.db);
    this.asset = new AssetSync(this.db);
    this.assetExif = new AssetExifSync(this.db);
    this.memory = new MemorySync(this.db);
    this.memoryToAsset = new MemoryToAssetSync(this.db);
    this.partner = new PartnerSync(this.db);
    this.partnerAsset = new PartnerAssetsSync(this.db);
    this.partnerAssetExif = new PartnerAssetExifsSync(this.db);
    this.partnerStack = new PartnerStackSync(this.db);
    this.stack = new StackSync(this.db);
    this.user = new UserSync(this.db);
  }
}

class BaseSync {
  constructor(protected db: Kysely<DB>) {}

  protected auditTableFilters<T extends keyof Pick<DB, AuditTables>, D>(
    qb: SelectQueryBuilder<DB, T, D>,
    ack?: SyncAck,
  ) {
    const builder = qb as SelectQueryBuilder<DB, AuditTables, D>;
    return builder
      .where('deletedAt', '<', sql.raw<Date>("now() - interval '1 millisecond'"))
      .$if(!!ack, (qb) => qb.where('id', '>', ack!.updateId))
      .orderBy('id', 'asc') as SelectQueryBuilder<DB, T, D>;
  }

  protected upsertTableFilters<T extends keyof Pick<DB, UpsertTables>, D>(
    qb: SelectQueryBuilder<DB, T, D>,
    ack?: SyncAck,
  ) {
    const builder = qb as SelectQueryBuilder<DB, UpsertTables, D>;
    return builder
      .where('updatedAt', '<', sql.raw<Date>("now() - interval '1 millisecond'"))
      .$if(!!ack, (qb) => qb.where('updateId', '>', ack!.updateId))
      .orderBy('updateId', 'asc') as SelectQueryBuilder<DB, T, D>;
  }
}

class AlbumSync extends BaseSync {
  @GenerateSql({ params: [DummyValue.UUID, DummyValue.UUID] })
  getCreatedAfter(userId: string, afterCreateId?: string) {
    return this.db
      .selectFrom('albums_shared_users_users')
      .select(['albumsId as id', 'createId'])
      .where('usersId', '=', userId)
      .$if(!!afterCreateId, (qb) => qb.where('createId', '>=', afterCreateId!))
      .where('createdAt', '<', sql.raw<Date>("now() - interval '1 millisecond'"))
      .orderBy('createId', 'asc')
      .execute();
  }

  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getDeletes(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('albums_audit')
      .select(['id', 'albumId'])
      .where('userId', '=', userId)
      .$call((qb) => this.auditTableFilters(qb, ack))
      .stream();
  }

  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getUpserts(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('albums')
      .distinctOn(['albums.id', 'albums.updateId'])
      .where('albums.updatedAt', '<', sql.raw<Date>("now() - interval '1 millisecond'"))
      .$if(!!ack, (qb) => qb.where('albums.updateId', '>', ack!.updateId))
      .orderBy('albums.updateId', 'asc')
      .leftJoin('albums_shared_users_users as album_users', 'albums.id', 'album_users.albumsId')
      .where((eb) => eb.or([eb('albums.ownerId', '=', userId), eb('album_users.usersId', '=', userId)]))
      .select([
        'albums.id',
        'albums.ownerId',
        'albums.albumName as name',
        'albums.description',
        'albums.createdAt',
        'albums.updatedAt',
        'albums.albumThumbnailAssetId as thumbnailAssetId',
        'albums.isActivityEnabled',
        'albums.order',
        'albums.updateId',
      ])
      .stream();
  }
}

class AlbumAssetSync extends BaseSync {
  constructor(
    protected db: Kysely<DB>,
    private searchRepository: SearchRepository,
    private albumRepository: AlbumRepository,
  ) {
    super(db);
  }

  @GenerateSql({ params: [DummyValue.UUID, DummyValue.UUID, DummyValue.UUID], stream: true })
  getBackfill(albumId: string, afterUpdateId: string | undefined, beforeUpdateId: string) {
    // Note: For dynamic albums, we need to do async operations, so we'll wrap this
    return this.getBackfillInternal(albumId, afterUpdateId, beforeUpdateId);
  }

  private async getBackfillInternal(albumId: string, afterUpdateId: string | undefined, beforeUpdateId: string) {
    // Check if this is a dynamic album
    const album = await this.albumRepository.getById(albumId, { withAssets: false });

    if (album?.dynamic && album.filters) {
      // For dynamic albums, use search functionality to get assets
      return this.getDynamicAlbumAssetsForBackfill(album, afterUpdateId, beforeUpdateId);
    }

    // For regular albums, use the existing logic
    return this.db
      .selectFrom('assets')
      .innerJoin('albums_assets_assets as album_assets', 'album_assets.assetsId', 'assets.id')
      .select(columns.syncAsset)
      .select('assets.updateId')
      .where('album_assets.albumsId', '=', albumId)
      .where('assets.updatedAt', '<', sql.raw<Date>("now() - interval '1 millisecond'"))
      .where('assets.updateId', '<=', beforeUpdateId)
      .$if(!!afterUpdateId, (eb) => eb.where('assets.updateId', '>=', afterUpdateId!))
      .orderBy('assets.updateId', 'asc')
      .stream();
  }

  private async getDynamicAlbumAssetsForBackfill(
    album: any,
    afterUpdateId: string | undefined,
    beforeUpdateId: string,
  ) {
    // Convert album filters to search options
    const searchOptions = FilterUtil.convertFiltersToSearchOptions(album.filters, album.ownerId);

    // Get assets that match the dynamic album filters
    const searchResult = await this.searchRepository.searchMetadata(
      { page: 1, size: 50000 }, // Large page size to get all matching assets
      { ...searchOptions, orderDirection: album.order === 'asc' ? 'asc' : 'desc' },
    );

    // Filter assets by updateId range and convert to sync format
    const filteredAssets = searchResult.items
      .filter((asset: any) => {
        const updateId = asset.updateId;
        const afterCondition = !afterUpdateId || updateId >= afterUpdateId;
        const beforeCondition = updateId <= beforeUpdateId;
        return afterCondition && beforeCondition;
      })
      .map((asset: any) => ({
        ...asset,
        updateId: asset.updateId,
      }))
      .sort((a: any, b: any) => a.updateId.localeCompare(b.updateId));

    // Convert to async generator to match the stream interface
    async function* streamAssets() {
      for (const asset of filteredAssets) {
        yield asset;
      }
    }

    return streamAssets();
  }

  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getUpserts(userId: string, ack?: SyncAck) {
    // Note: For dynamic albums, we need to do async operations, so we'll wrap this
    return this.getUpsertsInternal(userId, ack);
  }

  private async getUpsertsInternal(userId: string, ack?: SyncAck) {
    // First, get all albums this user has access to and separate regular from dynamic
    const [ownedAlbums, sharedAlbums] = await Promise.all([
      this.albumRepository.getOwned(userId),
      this.albumRepository.getShared(userId),
    ]);

    const allAlbums = [...ownedAlbums, ...sharedAlbums];
    const regularAlbums = allAlbums.filter((album) => !album.dynamic);
    const dynamicAlbums = allAlbums.filter((album) => album.dynamic);

    // Get assets from regular albums using the existing logic
    const regularAlbumIds = regularAlbums.map((album) => album.id);
    let regularAssetsStream: any = undefined;
    if (regularAlbumIds.length > 0) {
      regularAssetsStream = this.db
        .selectFrom('assets')
        .innerJoin('albums_assets_assets as album_assets', 'album_assets.assetsId', 'assets.id')
        .select(columns.syncAsset)
        .select('assets.updateId')
        .where('assets.updatedAt', '<', sql.raw<Date>("now() - interval '1 millisecond'"))
        .$if(!!ack, (qb) => qb.where('assets.updateId', '>', ack!.updateId))
        .orderBy('assets.updateId', 'asc')
        .innerJoin('albums', 'albums.id', 'album_assets.albumsId')
        .leftJoin('albums_shared_users_users as album_users', 'album_users.albumsId', 'album_assets.albumsId')
        .where((eb) => eb.or([eb('albums.ownerId', '=', userId), eb('album_users.usersId', '=', userId)]))
        .where('albums.dynamic', '=', false) // Only regular albums
        .stream();
    }

    // Get assets from dynamic albums
    const dynamicAssetsArrays = await Promise.all(
      dynamicAlbums.map(async (album) => {
        if (!album.filters) return [];

        try {
          const searchOptions = FilterUtil.convertFiltersToSearchOptions(album.filters, album.ownerId);
          const searchResult = await this.searchRepository.searchMetadata(
            { page: 1, size: 50000 },
            { ...searchOptions, orderDirection: album.order === 'asc' ? 'asc' : 'desc' },
          );

          return searchResult.items
            .filter((asset: any) => {
              const updateCondition = !ack || asset.updateId > ack.updateId;
              const timeCondition = new Date(asset.updatedAt) < new Date(Date.now() - 1000); // 1 second ago
              return updateCondition && timeCondition;
            })
            .map((asset: any) => ({
              ...asset,
              updateId: asset.updateId,
            }));
        } catch (error) {
          console.error(`Failed to get dynamic album assets for album ${album.id}:`, error);
          return [];
        }
      }),
    );

    // Flatten and sort dynamic assets
    const dynamicAssets = dynamicAssetsArrays.flat().sort((a: any, b: any) => a.updateId.localeCompare(b.updateId));

    // Combine regular and dynamic assets streams
    async function* combinedStream() {
      // Yield regular assets
      if (regularAssetsStream) {
        for await (const asset of regularAssetsStream) {
          yield asset;
        }
      }

      // Yield dynamic assets
      for (const asset of dynamicAssets) {
        yield asset;
      }
    }

    return combinedStream();
  }
}

class AlbumAssetExifSync extends BaseSync {
  constructor(
    protected db: Kysely<DB>,
    private searchRepository: SearchRepository,
    private albumRepository: AlbumRepository,
  ) {
    super(db);
  }

  @GenerateSql({ params: [DummyValue.UUID, DummyValue.UUID, DummyValue.UUID], stream: true })
  getBackfill(albumId: string, afterUpdateId: string | undefined, beforeUpdateId: string) {
    return this.getBackfillInternal(albumId, afterUpdateId, beforeUpdateId);
  }

  private async getBackfillInternal(albumId: string, afterUpdateId: string | undefined, beforeUpdateId: string) {
    // Check if this is a dynamic album
    const album = await this.albumRepository.getById(albumId, { withAssets: false });

    if (album?.dynamic && album.filters) {
      // For dynamic albums, use search functionality to get asset exif data
      return this.getDynamicAlbumAssetExifForBackfill(album, afterUpdateId, beforeUpdateId);
    }

    // For regular albums, use the existing logic
    return this.db
      .selectFrom('exif')
      .innerJoin('albums_assets_assets as album_assets', 'album_assets.assetsId', 'exif.assetId')
      .select(columns.syncAssetExif)
      .select('exif.updateId')
      .where('album_assets.albumsId', '=', albumId)
      .where('exif.updatedAt', '<', sql.raw<Date>("now() - interval '1 millisecond'"))
      .where('exif.updateId', '<=', beforeUpdateId)
      .$if(!!afterUpdateId, (eb) => eb.where('exif.updateId', '>=', afterUpdateId!))
      .orderBy('exif.updateId', 'asc')
      .stream();
  }

  private async getDynamicAlbumAssetExifForBackfill(
    album: any,
    afterUpdateId: string | undefined,
    beforeUpdateId: string,
  ) {
    // Convert album filters to search options
    const searchOptions = FilterUtil.convertFiltersToSearchOptions(album.filters, album.ownerId);

    // Get assets that match the dynamic album filters
    const searchResult = await this.searchRepository.searchMetadata(
      { page: 1, size: 50000 },
      { ...searchOptions, withExif: true, orderDirection: album.order === 'asc' ? 'asc' : 'desc' },
    );

    // Get exif data for matching assets and filter by updateId range
    const assetIds = searchResult.items.map((asset: any) => asset.id);
    if (assetIds.length === 0) {
      async function* emptyStream() {}
      return emptyStream();
    }

    // Query exif data for the assets
    const exifData = await this.db
      .selectFrom('exif')
      .select(columns.syncAssetExif)
      .select('exif.updateId')
      .where('exif.assetId', 'in', assetIds)
      .where('exif.updatedAt', '<', sql.raw<Date>("now() - interval '1 millisecond'"))
      .where('exif.updateId', '<=', beforeUpdateId)
      .$if(!!afterUpdateId, (eb) => eb.where('exif.updateId', '>=', afterUpdateId!))
      .orderBy('exif.updateId', 'asc')
      .execute();

    // Convert to async generator to match the stream interface
    async function* streamExifData() {
      for (const exif of exifData) {
        yield exif;
      }
    }

    return streamExifData();
  }

  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getUpserts(userId: string, ack?: SyncAck) {
    return this.getUpsertsInternal(userId, ack);
  }

  private async getUpsertsInternal(userId: string, ack?: SyncAck) {
    // First, get all albums this user has access to and separate regular from dynamic
    const [ownedAlbums, sharedAlbums] = await Promise.all([
      this.albumRepository.getOwned(userId),
      this.albumRepository.getShared(userId),
    ]);

    const allAlbums = [...ownedAlbums, ...sharedAlbums];
    const regularAlbums = allAlbums.filter((album) => !album.dynamic);
    const dynamicAlbums = allAlbums.filter((album) => album.dynamic);

    // Get exif data from regular albums using the existing logic
    const regularAlbumIds = regularAlbums.map((album) => album.id);
    let regularExifStream: any = undefined;
    if (regularAlbumIds.length > 0) {
      regularExifStream = this.db
        .selectFrom('exif')
        .innerJoin('albums_assets_assets as album_assets', 'album_assets.assetsId', 'exif.assetId')
        .select(columns.syncAssetExif)
        .select('exif.updateId')
        .where('exif.updatedAt', '<', sql.raw<Date>("now() - interval '1 millisecond'"))
        .$if(!!ack, (qb) => qb.where('exif.updateId', '>', ack!.updateId))
        .orderBy('exif.updateId', 'asc')
        .innerJoin('albums', 'albums.id', 'album_assets.albumsId')
        .leftJoin('albums_shared_users_users as album_users', 'album_users.albumsId', 'album_assets.albumsId')
        .where((eb) => eb.or([eb('albums.ownerId', '=', userId), eb('album_users.usersId', '=', userId)]))
        .where('albums.dynamic', '=', false) // Only regular albums
        .stream();
    }

    // Get exif data from dynamic albums
    const dynamicExifArrays = await Promise.all(
      dynamicAlbums.map(async (album) => {
        if (!album.filters) return [];

        try {
          const searchOptions = FilterUtil.convertFiltersToSearchOptions(album.filters, album.ownerId);
          const searchResult = await this.searchRepository.searchMetadata(
            { page: 1, size: 50000 },
            { ...searchOptions, withExif: true, orderDirection: album.order === 'asc' ? 'asc' : 'desc' },
          );

          const assetIds = searchResult.items.map((asset: any) => asset.id);
          if (assetIds.length === 0) return [];

          // Query exif data for these assets
          const exifData = await this.db
            .selectFrom('exif')
            .select(columns.syncAssetExif)
            .select('exif.updateId')
            .where('exif.assetId', 'in', assetIds)
            .where('exif.updatedAt', '<', sql.raw<Date>("now() - interval '1 millisecond'"))
            .$if(!!ack, (qb) => qb.where('exif.updateId', '>', ack!.updateId))
            .orderBy('exif.updateId', 'asc')
            .execute();

          return exifData;
        } catch (error) {
          console.error(`Failed to get dynamic album exif data for album ${album.id}:`, error);
          return [];
        }
      }),
    );

    // Flatten and sort dynamic exif data
    const dynamicExifData = dynamicExifArrays.flat().sort((a: any, b: any) => a.updateId.localeCompare(b.updateId));

    // Combine regular and dynamic exif streams
    async function* combinedStream() {
      // Yield regular exif data
      if (regularExifStream) {
        for await (const exif of regularExifStream) {
          yield exif;
        }
      }

      // Yield dynamic exif data
      for (const exif of dynamicExifData) {
        yield exif;
      }
    }

    return combinedStream();
  }
}

class AlbumToAssetSync extends BaseSync {
  constructor(
    protected db: Kysely<DB>,
    private searchRepository: SearchRepository,
    private albumRepository: AlbumRepository,
  ) {
    super(db);
  }

  @GenerateSql({ params: [DummyValue.UUID, DummyValue.UUID, DummyValue.UUID], stream: true })
  getBackfill(albumId: string, afterUpdateId: string | undefined, beforeUpdateId: string) {
    return this.getBackfillInternal(albumId, afterUpdateId, beforeUpdateId);
  }

  private async getBackfillInternal(albumId: string, afterUpdateId: string | undefined, beforeUpdateId: string) {
    // Check if this is a dynamic album
    const album = await this.albumRepository.getById(albumId, { withAssets: false });

    if (album?.dynamic && album.filters) {
      // For dynamic albums, create virtual album-to-asset relationships
      return this.getDynamicAlbumToAssetBackfill(album, afterUpdateId, beforeUpdateId);
    }

    // For regular albums, use the existing logic
    return this.db
      .selectFrom('albums_assets_assets as album_assets')
      .select(['album_assets.assetsId as assetId', 'album_assets.albumsId as albumId', 'album_assets.updateId'])
      .where('album_assets.albumsId', '=', albumId)
      .where('album_assets.updatedAt', '<', sql.raw<Date>("now() - interval '1 millisecond'"))
      .where('album_assets.updateId', '<=', beforeUpdateId)
      .$if(!!afterUpdateId, (eb) => eb.where('album_assets.updateId', '>=', afterUpdateId!))
      .orderBy('album_assets.updateId', 'asc')
      .stream();
  }

  private async getDynamicAlbumToAssetBackfill(album: any, afterUpdateId: string | undefined, beforeUpdateId: string) {
    // Convert album filters to search options
    const searchOptions = FilterUtil.convertFiltersToSearchOptions(album.filters, album.ownerId);

    // Get assets that match the dynamic album filters
    const searchResult = await this.searchRepository.searchMetadata(
      { page: 1, size: 50000 },
      { ...searchOptions, orderDirection: album.order === 'asc' ? 'asc' : 'desc' },
    );

    // Create virtual album-to-asset relationships
    const relationships = searchResult.items
      .filter((asset: any) => {
        const updateId = asset.updateId;
        const afterCondition = !afterUpdateId || updateId >= afterUpdateId;
        const beforeCondition = updateId <= beforeUpdateId;
        return afterCondition && beforeCondition;
      })
      .map((asset: any) => ({
        assetId: asset.id,
        albumId: album.id,
        updateId: asset.updateId, // Use asset's updateId since there's no album_assets entry
      }))
      .sort((a: any, b: any) => a.updateId.localeCompare(b.updateId));

    // Convert to async generator to match the stream interface
    async function* streamRelationships() {
      for (const relationship of relationships) {
        yield relationship;
      }
    }

    return streamRelationships();
  }

  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getDeletes(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('album_assets_audit')
      .select(['id', 'assetId', 'albumId'])
      .where((eb) =>
        eb(
          'albumId',
          'in',
          eb
            .selectFrom('albums')
            .select(['id'])
            .where('ownerId', '=', userId)
            .union((eb) =>
              eb.parens(
                eb
                  .selectFrom('albums_shared_users_users as albumUsers')
                  .select(['albumUsers.albumsId as id'])
                  .where('albumUsers.usersId', '=', userId),
              ),
            ),
        ),
      )
      .$call((qb) => this.auditTableFilters(qb, ack))
      .stream();
  }

  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getUpserts(userId: string, ack?: SyncAck) {
    return this.getUpsertsInternal(userId, ack);
  }

  private async getUpsertsInternal(userId: string, ack?: SyncAck) {
    // First, get all albums this user has access to and separate regular from dynamic
    const [ownedAlbums, sharedAlbums] = await Promise.all([
      this.albumRepository.getOwned(userId),
      this.albumRepository.getShared(userId),
    ]);

    const allAlbums = [...ownedAlbums, ...sharedAlbums];
    const regularAlbums = allAlbums.filter((album) => !album.dynamic);
    const dynamicAlbums = allAlbums.filter((album) => album.dynamic);

    // Get album-to-asset relationships from regular albums using the existing logic
    const regularAlbumIds = regularAlbums.map((album) => album.id);
    let regularRelationshipsStream: any = undefined;
    if (regularAlbumIds.length > 0) {
      regularRelationshipsStream = this.db
        .selectFrom('albums_assets_assets as album_assets')
        .select(['album_assets.assetsId as assetId', 'album_assets.albumsId as albumId', 'album_assets.updateId'])
        .where('album_assets.updatedAt', '<', sql.raw<Date>("now() - interval '1 millisecond'"))
        .$if(!!ack, (qb) => qb.where('album_assets.updateId', '>', ack!.updateId))
        .orderBy('album_assets.updateId', 'asc')
        .innerJoin('albums', 'albums.id', 'album_assets.albumsId')
        .leftJoin('albums_shared_users_users as album_users', 'album_users.albumsId', 'album_assets.albumsId')
        .where((eb) => eb.or([eb('albums.ownerId', '=', userId), eb('album_users.usersId', '=', userId)]))
        .where('albums.dynamic', '=', false) // Only regular albums
        .stream();
    }

    // Get virtual album-to-asset relationships from dynamic albums
    const dynamicRelationshipsArrays = await Promise.all(
      dynamicAlbums.map(async (album) => {
        if (!album.filters) return [];

        try {
          const searchOptions = FilterUtil.convertFiltersToSearchOptions(album.filters, album.ownerId);
          const searchResult = await this.searchRepository.searchMetadata(
            { page: 1, size: 50000 },
            { ...searchOptions, orderDirection: album.order === 'asc' ? 'asc' : 'desc' },
          );

          return searchResult.items
            .filter((asset: any) => {
              const updateCondition = !ack || asset.updateId > ack.updateId;
              const timeCondition = new Date(asset.updatedAt) < new Date(Date.now() - 1000); // 1 second ago
              return updateCondition && timeCondition;
            })
            .map((asset: any) => ({
              assetId: asset.id,
              albumId: album.id,
              updateId: asset.updateId, // Use asset's updateId since there's no album_assets entry
            }));
        } catch (error) {
          console.error(`Failed to get dynamic album relationships for album ${album.id}:`, error);
          return [];
        }
      }),
    );

    // Flatten and sort dynamic relationships
    const dynamicRelationships = dynamicRelationshipsArrays
      .flat()
      .sort((a: any, b: any) => a.updateId.localeCompare(b.updateId));

    // Combine regular and dynamic relationship streams
    async function* combinedStream() {
      // Yield regular relationships
      if (regularRelationshipsStream) {
        for await (const relationship of regularRelationshipsStream) {
          yield relationship;
        }
      }

      // Yield dynamic relationships
      for (const relationship of dynamicRelationships) {
        yield relationship;
      }
    }

    return combinedStream();
  }
}

class AlbumUserSync extends BaseSync {
  @GenerateSql({ params: [DummyValue.UUID, DummyValue.UUID, DummyValue.UUID, DummyValue.UUID], stream: true })
  getBackfill(albumId: string, afterUpdateId: string | undefined, beforeUpdateId: string) {
    return this.db
      .selectFrom('albums_shared_users_users as album_users')
      .select(columns.syncAlbumUser)
      .select('album_users.updateId')
      .where('albumsId', '=', albumId)
      .where('updatedAt', '<', sql.raw<Date>("now() - interval '1 millisecond'"))
      .where('updateId', '<=', beforeUpdateId)
      .$if(!!afterUpdateId, (eb) => eb.where('updateId', '>=', afterUpdateId!))
      .orderBy('updateId', 'asc')
      .stream();
  }

  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getDeletes(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('album_users_audit')
      .select(['id', 'userId', 'albumId'])
      .where((eb) =>
        eb(
          'albumId',
          'in',
          eb
            .selectFrom('albums')
            .select(['id'])
            .where('ownerId', '=', userId)
            .union((eb) =>
              eb.parens(
                eb
                  .selectFrom('albums_shared_users_users as albumUsers')
                  .select(['albumUsers.albumsId as id'])
                  .where('albumUsers.usersId', '=', userId),
              ),
            ),
        ),
      )
      .$call((qb) => this.auditTableFilters(qb, ack))
      .stream();
  }

  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getUpserts(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('albums_shared_users_users as album_users')
      .select(columns.syncAlbumUser)
      .select('album_users.updateId')
      .where('album_users.updatedAt', '<', sql.raw<Date>("now() - interval '1 millisecond'"))
      .$if(!!ack, (qb) => qb.where('album_users.updateId', '>', ack!.updateId))
      .orderBy('album_users.updateId', 'asc')
      .where((eb) =>
        eb(
          'album_users.albumsId',
          'in',
          eb
            .selectFrom('albums')
            .select(['id'])
            .where('ownerId', '=', userId)
            .union((eb) =>
              eb.parens(
                eb
                  .selectFrom('albums_shared_users_users as albumUsers')
                  .select(['albumUsers.albumsId as id'])
                  .where('albumUsers.usersId', '=', userId),
              ),
            ),
        ),
      )
      .stream();
  }
}

class AssetSync extends BaseSync {
  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getDeletes(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('assets_audit')
      .select(['id', 'assetId'])
      .where('ownerId', '=', userId)
      .$call((qb) => this.auditTableFilters(qb, ack))
      .stream();
  }

  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getUpserts(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('assets')
      .select(columns.syncAsset)
      .select('assets.updateId')
      .where('ownerId', '=', userId)
      .$call((qb) => this.upsertTableFilters(qb, ack))
      .stream();
  }
}

class AssetExifSync extends BaseSync {
  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getUpserts(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('exif')
      .select(columns.syncAssetExif)
      .select('exif.updateId')
      .where('assetId', 'in', (eb) => eb.selectFrom('assets').select('id').where('ownerId', '=', userId))
      .$call((qb) => this.upsertTableFilters(qb, ack))
      .stream();
  }
}

class MemorySync extends BaseSync {
  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getDeletes(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('memories_audit')
      .select(['id', 'memoryId'])
      .where('userId', '=', userId)
      .$call((qb) => this.auditTableFilters(qb, ack))
      .stream();
  }

  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getUpserts(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('memories')
      .select([
        'id',
        'createdAt',
        'updatedAt',
        'deletedAt',
        'ownerId',
        'type',
        'data',
        'isSaved',
        'memoryAt',
        'seenAt',
        'showAt',
        'hideAt',
      ])
      .select('updateId')
      .where('ownerId', '=', userId)
      .$call((qb) => this.upsertTableFilters(qb, ack))
      .stream();
  }
}

class MemoryToAssetSync extends BaseSync {
  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getDeletes(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('memory_assets_audit')
      .select(['id', 'memoryId', 'assetId'])
      .where('memoryId', 'in', (eb) => eb.selectFrom('memories').select('id').where('ownerId', '=', userId))
      .$call((qb) => this.auditTableFilters(qb, ack))
      .stream();
  }

  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getUpserts(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('memories_assets_assets')
      .select(['memoriesId as memoryId', 'assetsId as assetId'])
      .select('updateId')
      .where('memoriesId', 'in', (eb) => eb.selectFrom('memories').select('id').where('ownerId', '=', userId))
      .$call((qb) => this.upsertTableFilters(qb, ack))
      .stream();
  }
}

class PartnerSync extends BaseSync {
  @GenerateSql({ params: [DummyValue.UUID, DummyValue.UUID] })
  getCreatedAfter(userId: string, afterCreateId?: string) {
    return this.db
      .selectFrom('partners')
      .select(['sharedById', 'createId'])
      .where('sharedWithId', '=', userId)
      .$if(!!afterCreateId, (qb) => qb.where('createId', '>=', afterCreateId!))
      .where('createdAt', '<', sql.raw<Date>("now() - interval '1 millisecond'"))
      .orderBy('partners.createId', 'asc')
      .execute();
  }

  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getDeletes(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('partners_audit')
      .select(['id', 'sharedById', 'sharedWithId'])
      .where((eb) => eb.or([eb('sharedById', '=', userId), eb('sharedWithId', '=', userId)]))
      .$call((qb) => this.auditTableFilters(qb, ack))
      .stream();
  }

  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getUpserts(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('partners')
      .select(['sharedById', 'sharedWithId', 'inTimeline', 'updateId'])
      .where((eb) => eb.or([eb('sharedById', '=', userId), eb('sharedWithId', '=', userId)]))
      .$call((qb) => this.upsertTableFilters(qb, ack))
      .stream();
  }
}

class PartnerAssetsSync extends BaseSync {
  @GenerateSql({ params: [DummyValue.UUID, DummyValue.UUID, DummyValue.UUID], stream: true })
  getBackfill(partnerId: string, afterUpdateId: string | undefined, beforeUpdateId: string) {
    return this.db
      .selectFrom('assets')
      .select(columns.syncAsset)
      .select('assets.updateId')
      .where('ownerId', '=', partnerId)
      .where('updatedAt', '<', sql.raw<Date>("now() - interval '1 millisecond'"))
      .where('updateId', '<=', beforeUpdateId)
      .$if(!!afterUpdateId, (eb) => eb.where('updateId', '>=', afterUpdateId!))
      .orderBy('updateId', 'asc')
      .stream();
  }

  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getDeletes(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('assets_audit')
      .select(['id', 'assetId'])
      .where('ownerId', 'in', (eb) =>
        eb.selectFrom('partners').select(['sharedById']).where('sharedWithId', '=', userId),
      )
      .$call((qb) => this.auditTableFilters(qb, ack))
      .stream();
  }

  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getUpserts(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('assets')
      .select(columns.syncAsset)
      .select('assets.updateId')
      .where('ownerId', 'in', (eb) =>
        eb.selectFrom('partners').select(['sharedById']).where('sharedWithId', '=', userId),
      )
      .$call((qb) => this.upsertTableFilters(qb, ack))
      .stream();
  }
}

class PartnerAssetExifsSync extends BaseSync {
  @GenerateSql({ params: [DummyValue.UUID, DummyValue.UUID, DummyValue.UUID], stream: true })
  getBackfill(partnerId: string, afterUpdateId: string | undefined, beforeUpdateId: string) {
    return this.db
      .selectFrom('exif')
      .select(columns.syncAssetExif)
      .select('exif.updateId')
      .innerJoin('assets', 'assets.id', 'exif.assetId')
      .where('assets.ownerId', '=', partnerId)
      .where('exif.updatedAt', '<', sql.raw<Date>("now() - interval '1 millisecond'"))
      .where('exif.updateId', '<=', beforeUpdateId)
      .$if(!!afterUpdateId, (eb) => eb.where('exif.updateId', '>=', afterUpdateId!))
      .orderBy('exif.updateId', 'asc')
      .stream();
  }

  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getUpserts(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('exif')
      .select(columns.syncAssetExif)
      .select('exif.updateId')
      .where('assetId', 'in', (eb) =>
        eb
          .selectFrom('assets')
          .select('id')
          .where('ownerId', 'in', (eb) =>
            eb.selectFrom('partners').select(['sharedById']).where('sharedWithId', '=', userId),
          ),
      )
      .$call((qb) => this.upsertTableFilters(qb, ack))
      .stream();
  }
}

class StackSync extends BaseSync {
  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getDeletes(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('stacks_audit')
      .select(['id', 'stackId'])
      .where('userId', '=', userId)
      .$call((qb) => this.auditTableFilters(qb, ack))
      .stream();
  }

  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getUpserts(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('asset_stack')
      .select(columns.syncStack)
      .select('updateId')
      .where('ownerId', '=', userId)
      .$call((qb) => this.upsertTableFilters(qb, ack))
      .stream();
  }
}

class PartnerStackSync extends BaseSync {
  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getDeletes(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('stacks_audit')
      .select(['id', 'stackId'])
      .where('userId', 'in', (eb) =>
        eb.selectFrom('partners').select(['sharedById']).where('sharedWithId', '=', userId),
      )
      .$call((qb) => this.auditTableFilters(qb, ack))
      .stream();
  }

  @GenerateSql({ params: [DummyValue.UUID, DummyValue.UUID, DummyValue.UUID], stream: true })
  getBackfill(partnerId: string, afterUpdateId: string | undefined, beforeUpdateId: string) {
    return this.db
      .selectFrom('asset_stack')
      .select(columns.syncStack)
      .select('updateId')
      .where('ownerId', '=', partnerId)
      .where('updatedAt', '<', sql.raw<Date>("now() - interval '1 millisecond'"))
      .where('updateId', '<=', beforeUpdateId)
      .$if(!!afterUpdateId, (eb) => eb.where('updateId', '>=', afterUpdateId!))
      .orderBy('updateId', 'asc')
      .stream();
  }

  @GenerateSql({ params: [DummyValue.UUID], stream: true })
  getUpserts(userId: string, ack?: SyncAck) {
    return this.db
      .selectFrom('asset_stack')
      .select(columns.syncStack)
      .select('updateId')
      .where('ownerId', 'in', (eb) =>
        eb.selectFrom('partners').select(['sharedById']).where('sharedWithId', '=', userId),
      )
      .$call((qb) => this.upsertTableFilters(qb, ack))
      .stream();
  }
}
class UserSync extends BaseSync {
  @GenerateSql({ params: [], stream: true })
  getDeletes(ack?: SyncAck) {
    return this.db
      .selectFrom('users_audit')
      .select(['id', 'userId'])
      .$call((qb) => this.auditTableFilters(qb, ack))
      .stream();
  }

  @GenerateSql({ params: [], stream: true })
  getUpserts(ack?: SyncAck) {
    return this.db
      .selectFrom('users')
      .select(['id', 'name', 'email', 'deletedAt', 'updateId'])
      .$call((qb) => this.upsertTableFilters(qb, ack))
      .stream();
  }
}
