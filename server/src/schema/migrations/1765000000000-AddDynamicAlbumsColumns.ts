import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add dynamic column to album table (defaults to false for backward compatibility)
  await sql`ALTER TABLE "album" ADD COLUMN "dynamic" boolean NOT NULL DEFAULT false;`.execute(db);

  // Add filters column to album table (stores JSONB for flexible filter structure)
  await sql`ALTER TABLE "album" ADD COLUMN "filters" jsonb;`.execute(db);

  // Create index on dynamic column for faster filtering
  await sql`CREATE INDEX "IDX_album_dynamic" ON "album" ("dynamic");`.execute(db);

  // Create GIN index on filters column for efficient JSONB querying
  await sql`CREATE INDEX "IDX_album_filters" ON "album" USING gin ("filters");`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop indexes first
  await sql`DROP INDEX IF EXISTS "IDX_album_dynamic";`.execute(db);
  await sql`DROP INDEX IF EXISTS "IDX_album_filters";`.execute(db);

  // Drop columns
  await sql`ALTER TABLE "album" DROP COLUMN IF EXISTS "filters";`.execute(db);
  await sql`ALTER TABLE "album" DROP COLUMN IF EXISTS "dynamic";`.execute(db);
}
