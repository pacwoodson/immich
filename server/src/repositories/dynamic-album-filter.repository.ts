import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/schema';
import { DynamicAlbumFilterTable } from 'src/schema/tables/dynamic-album-filter.table';

@Injectable()
export class DynamicAlbumFilterRepository {
  constructor(@InjectKysely() private db: Kysely<DB>) {}

  async create(filter: Insertable<DynamicAlbumFilterTable>) {
    return this.db.insertInto('dynamic_album_filters').values(filter).returningAll().executeTakeFirstOrThrow();
  }

  async createMany(filters: Insertable<DynamicAlbumFilterTable>[]) {
    if (filters.length === 0) {
      return [];
    }
    return this.db.insertInto('dynamic_album_filters').values(filters).returningAll().execute();
  }

  async getByDynamicAlbumId(dynamicAlbumId: string) {
    return this.db
      .selectFrom('dynamic_album_filters')
      .selectAll()
      .where('dynamicAlbumId', '=', dynamicAlbumId)
      .execute();
  }

  async deleteByDynamicAlbumId(dynamicAlbumId: string): Promise<void> {
    await this.db.deleteFrom('dynamic_album_filters').where('dynamicAlbumId', '=', dynamicAlbumId).execute();
  }

  async updateByDynamicAlbumId(dynamicAlbumId: string, filters: Insertable<DynamicAlbumFilterTable>[]): Promise<void> {
    await this.db.transaction().execute(async (tx) => {
      await tx.deleteFrom('dynamic_album_filters').where('dynamicAlbumId', '=', dynamicAlbumId).execute();
      if (filters.length > 0) {
        await tx.insertInto('dynamic_album_filters').values(filters).execute();
      }
    });
  }
} 