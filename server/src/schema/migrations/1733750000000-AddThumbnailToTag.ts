import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE "tag" ADD COLUMN "thumbnailAssetId" uuid;`.execute(db);
  await sql`ALTER TABLE "tag" ADD CONSTRAINT "tag_thumbnailAssetId_fkey" FOREIGN KEY ("thumbnailAssetId") REFERENCES "asset" ("id") ON UPDATE CASCADE ON DELETE SET NULL;`.execute(db);
  await sql`CREATE INDEX "tag_thumbnailAssetId_idx" ON "tag" ("thumbnailAssetId");`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX "tag_thumbnailAssetId_idx";`.execute(db);
  await sql`ALTER TABLE "tag" DROP CONSTRAINT "tag_thumbnailAssetId_fkey";`.execute(db);
  await sql`ALTER TABLE "tag" DROP COLUMN "thumbnailAssetId";`.execute(db);
}
