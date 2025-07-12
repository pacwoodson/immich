import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add dynamicAlbumId column to shared_links table
  await sql`ALTER TABLE "shared_links" ADD COLUMN "dynamicAlbumId" uuid`.execute(db);

  // Add foreign key constraint
  await sql`ALTER TABLE "shared_links" ADD CONSTRAINT "FK_shared_links_dynamic_albums" FOREIGN KEY ("dynamicAlbumId") REFERENCES "dynamic_albums"("id") ON DELETE CASCADE ON UPDATE CASCADE`.execute(
    db,
  );

  // Add index for better performance
  await sql`CREATE INDEX "IDX_sharedlink_dynamicAlbumId" ON "shared_links"("dynamicAlbumId")`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop the index
  await sql`DROP INDEX IF EXISTS "IDX_sharedlink_dynamicAlbumId"`.execute(db);

  // Drop the foreign key constraint
  await sql`ALTER TABLE "shared_links" DROP CONSTRAINT IF EXISTS "FK_shared_links_dynamic_albums"`.execute(db);

  // Drop the column
  await sql`ALTER TABLE "shared_links" DROP COLUMN IF EXISTS "dynamicAlbumId"`.execute(db);
}
