import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/schema';
import { DynamicAlbumShareTable } from 'src/schema/tables/dynamic-album-share.table';

@Injectable()
export class DynamicAlbumShareRepository {
  constructor(@InjectKysely() private db: Kysely<DB>) {}

  async create(share: Insertable<DynamicAlbumShareTable>) {
    return this.db.insertInto('dynamic_album_shares').values(share).returningAll().executeTakeFirstOrThrow();
  }

  async getByDynamicAlbumId(dynamicAlbumId: string) {
    return this.db
      .selectFrom('dynamic_album_shares')
      .selectAll()
      .where('dynamicAlbumId', '=', dynamicAlbumId)
      .execute();
  }

  async getByUserId(userId: string) {
    return this.db
      .selectFrom('dynamic_album_shares')
      .selectAll()
      .where('userId', '=', userId)
      .execute();
  }

  async update(dynamicAlbumId: string, userId: string, share: Updateable<DynamicAlbumShareTable>) {
    return this.db
      .updateTable('dynamic_album_shares')
      .set(share)
      .where('dynamicAlbumId', '=', dynamicAlbumId)
      .where('userId', '=', userId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async delete(dynamicAlbumId: string, userId: string): Promise<void> {
    await this.db
      .deleteFrom('dynamic_album_shares')
      .where('dynamicAlbumId', '=', dynamicAlbumId)
      .where('userId', '=', userId)
      .execute();
  }

  async deleteByDynamicAlbumId(dynamicAlbumId: string): Promise<void> {
    await this.db.deleteFrom('dynamic_album_shares').where('dynamicAlbumId', '=', dynamicAlbumId).execute();
  }
} 