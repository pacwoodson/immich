import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add dynamic column to albums table (defaults to false for backward compatibility)
  await sql`ALTER TABLE "albums" ADD COLUMN "dynamic" boolean NOT NULL DEFAULT false;`.execute(db);

  // Add filters column to albums table (stores JSONB for flexible filter structure)
  await sql`ALTER TABLE "albums" ADD COLUMN "filters" jsonb;`.execute(db);

  // Create index on dynamic column for faster filtering
  await sql`CREATE INDEX "IDX_albums_dynamic" ON "albums" ("dynamic");`.execute(db);

  // Create GIN index on filters column for efficient JSONB querying
  await sql`CREATE INDEX "IDX_albums_filters" ON "albums" USING gin ("filters");`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop indexes first
  await sql`DROP INDEX IF EXISTS "IDX_albums_dynamic";`.execute(db);
  await sql`DROP INDEX IF EXISTS "IDX_albums_filters";`.execute(db);

  // Drop columns
  await sql`ALTER TABLE "albums" DROP COLUMN IF EXISTS "filters";`.execute(db);
  await sql`ALTER TABLE "albums" DROP COLUMN IF EXISTS "dynamic";`.execute(db);
}
