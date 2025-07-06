import { Injectable } from '@nestjs/common';
import { ExpressionBuilder, Insertable, Kysely, sql, Updateable } from 'kysely';
import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/postgres';
import { InjectKysely } from 'nestjs-kysely';
import { columns } from 'src/database';
import { ChunkedArray, DummyValue, GenerateSql } from 'src/decorators';
import { DynamicAlbumFilterRepository } from 'src/repositories/dynamic-album-filter.repository';
import { DB } from 'src/schema';
import { DynamicAlbumTable } from 'src/schema/tables/dynamic-album.table';
import {
  buildDynamicAlbumAssetCountQuery,
  buildDynamicAlbumAssetQuery,
  DynamicAlbumFilter,
} from 'src/utils/dynamic-album-filter';

export interface DynamicAlbumAssetCount {
  dynamicAlbumId: string;
  assetCount: number;
  startDate: Date | null;
  endDate: Date | null;
}

const withOwner = (eb: ExpressionBuilder<DB, 'dynamic_albums'>) => {
  return jsonObjectFrom(eb.selectFrom('users').select(columns.user).whereRef('users.id', '=', 'dynamic_albums.ownerId'))
    .$notNull()
    .as('owner');
};

const withSharedUsers = (eb: ExpressionBuilder<DB, 'dynamic_albums'>) => {
  return jsonArrayFrom(
    eb
      .selectFrom('dynamic_album_shares as shares')
      .select('shares.role')
      .select('shares.createdAt')
      .select((eb) =>
        jsonObjectFrom(eb.selectFrom('users').select(columns.user).whereRef('users.id', '=', 'shares.userId'))
          .$notNull()
          .as('user'),
      )
      .whereRef('shares.dynamicAlbumId', '=', 'dynamic_albums.id'),
  )
    .$notNull()
    .as('sharedUsers');
};

const withFilters = (eb: ExpressionBuilder<DB, 'dynamic_albums'>) => {
  return jsonArrayFrom(
    eb
      .selectFrom('dynamic_album_filters')
      .selectAll()
      .whereRef('dynamic_album_filters.dynamicAlbumId', '=', 'dynamic_albums.id'),
  )
    .$notNull()
    .as('filters');
};

@Injectable()
export class DynamicAlbumRepository {
  constructor(
    @InjectKysely() private db: Kysely<DB>,
    private dynamicAlbumFilterRepository: DynamicAlbumFilterRepository,
  ) {}

  @GenerateSql({ params: [DummyValue.UUID] })
  async getById(id: string) {
    return this.db
      .selectFrom('dynamic_albums')
      .selectAll('dynamic_albums')
      .where('dynamic_albums.id', '=', id)
      .where('dynamic_albums.deletedAt', 'is', null)
      .select(withOwner)
      .select(withSharedUsers)
      .select(withFilters)
      .executeTakeFirst();
  }

  @GenerateSql({ params: [DummyValue.UUID] })
  async getOwned(ownerId: string) {
    return this.db
      .selectFrom('dynamic_albums')
      .selectAll('dynamic_albums')
      .select(withOwner)
      .select(withSharedUsers)
      .select(withFilters)
      .where('dynamic_albums.ownerId', '=', ownerId)
      .where('dynamic_albums.deletedAt', 'is', null)
      .orderBy('dynamic_albums.createdAt', 'desc')
      .execute();
  }

  @GenerateSql({ params: [DummyValue.UUID] })
  async getShared(userId: string) {
    return this.db
      .selectFrom('dynamic_albums')
      .selectAll('dynamic_albums')
      .where((eb) =>
        eb.exists(
          eb
            .selectFrom('dynamic_album_shares as shares')
            .whereRef('shares.dynamicAlbumId', '=', 'dynamic_albums.id')
            .where('shares.userId', '=', userId),
        ),
      )
      .where('dynamic_albums.deletedAt', 'is', null)
      .select(withOwner)
      .select(withSharedUsers)
      .select(withFilters)
      .orderBy('dynamic_albums.createdAt', 'desc')
      .execute();
  }

  @GenerateSql({ params: [[DummyValue.UUID]] })
  @ChunkedArray()
  async getMetadataForIds(ids: string[]): Promise<DynamicAlbumAssetCount[]> {
    // Guard against running invalid query when ids list is empty.
    if (ids.length === 0) {
      return [];
    }

    const results: DynamicAlbumAssetCount[] = [];

    for (const id of ids) {
      const album = await this.getById(id);
      if (!album) {
        results.push({
          dynamicAlbumId: id,
          assetCount: 0,
          startDate: null,
          endDate: null,
        });
        continue;
      }

      const filters = await this.dynamicAlbumFilterRepository.getByDynamicAlbumId(id);
      const dynamicFilters: DynamicAlbumFilter[] = filters.map((filter) => ({
        type: filter.filterType,
        value: filter.filterValue,
      }));

      const result = await buildDynamicAlbumAssetCountQuery(this.db, dynamicFilters, album.ownerId).execute();
      const metadata = result[0];

      results.push({
        dynamicAlbumId: id,
        assetCount: Number(metadata?.assetCount) || 0,
        startDate: metadata?.startDate || null,
        endDate: metadata?.endDate || null,
      });
    }

    return results;
  }

  @GenerateSql({ params: [DummyValue.UUID, DummyValue.UUID] })
  getAssetIds(_dynamicAlbumId: string, _assetIds: string[]): Promise<Set<string>> {
    // This is a placeholder implementation
    // The actual implementation will need to query assets based on filters
    // For now, return empty set
    return Promise.resolve(new Set());
  }

  @GenerateSql({ params: [DummyValue.UUID, DummyValue.UUID] })
  async getAssets(dynamicAlbumId: string, options: { skip?: number; take?: number } = {}) {
    const album = await this.getById(dynamicAlbumId);
    if (!album) {
      return [];
    }

    const filters = await this.dynamicAlbumFilterRepository.getByDynamicAlbumId(dynamicAlbumId);
    const dynamicFilters: DynamicAlbumFilter[] = filters.map((filter) => ({
      type: filter.filterType,
      value: filter.filterValue,
    }));

    const query = buildDynamicAlbumAssetQuery(this.db, dynamicFilters, {
      userId: album.ownerId,
      skip: options.skip,
      take: options.take,
      order: 'desc',
    });

    return query.execute();
  }

  @GenerateSql({ params: [DummyValue.UUID] })
  async getAssetCount(dynamicAlbumId: string): Promise<number> {
    const album = await this.getById(dynamicAlbumId);
    if (!album) {
      return 0;
    }

    const filters = await this.dynamicAlbumFilterRepository.getByDynamicAlbumId(dynamicAlbumId);
    const dynamicFilters: DynamicAlbumFilter[] = filters.map((filter) => ({
      type: filter.filterType,
      value: filter.filterValue,
    }));

    const result = await buildDynamicAlbumAssetCountQuery(this.db, dynamicFilters, album.ownerId).execute();
    return Number(result[0]?.assetCount) || 0;
  }

  create(dynamicAlbum: Insertable<DynamicAlbumTable>) {
    return this.db.insertInto('dynamic_albums').values(dynamicAlbum).returningAll().executeTakeFirstOrThrow();
  }

  update(id: string, dynamicAlbum: Updateable<DynamicAlbumTable>) {
    return this.db
      .updateTable('dynamic_albums')
      .set(dynamicAlbum)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  @GenerateSql({ params: [DummyValue.UUID] })
  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('dynamic_albums').where('id', '=', id).execute();
  }

  @GenerateSql({ params: [DummyValue.UUID] })
  async softDelete(id: string): Promise<void> {
    await this.db
      .updateTable('dynamic_albums')
      .set({ deletedAt: sql`now()` })
      .where('id', '=', id)
      .execute();
  }

  @GenerateSql({ params: [DummyValue.UUID] })
  async restore(id: string): Promise<void> {
    await this.db.updateTable('dynamic_albums').set({ deletedAt: null }).where('id', '=', id).execute();
  }
}
