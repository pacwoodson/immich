import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE "shared_link" ADD COLUMN "tagId" uuid;`.execute(db);
  await sql`ALTER TABLE "shared_link" ADD CONSTRAINT "shared_link_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag" ("id") ON UPDATE CASCADE ON DELETE CASCADE;`.execute(
    db,
  );
  await sql`CREATE INDEX "shared_link_tagId_idx" ON "shared_link" ("tagId");`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX "shared_link_tagId_idx";`.execute(db);
  await sql`ALTER TABLE "shared_link" DROP CONSTRAINT "shared_link_tagId_fkey";`.execute(db);
  await sql`ALTER TABLE "shared_link" DROP COLUMN "tagId";`.execute(db);
}
