import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add dynamic boolean field to albums table
  await sql`
    ALTER TABLE albums 
    ADD COLUMN dynamic boolean DEFAULT false NOT NULL
  `.execute(db);

  // Add filters JSONB field to albums table
  await sql`
    ALTER TABLE albums 
    ADD COLUMN filters jsonb DEFAULT null
  `.execute(db);

  // Create indexes for performance
  await sql`
    CREATE INDEX IDX_albums_dynamic ON albums(dynamic)
  `.execute(db);

  await sql`
    CREATE INDEX IDX_albums_filters ON albums USING gin(filters)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Remove indexes
  await sql`DROP INDEX IF EXISTS IDX_albums_dynamic`.execute(db);
  await sql`DROP INDEX IF EXISTS IDX_albums_filters`.execute(db);

  // Remove columns
  await sql`ALTER TABLE albums DROP COLUMN IF EXISTS filters`.execute(db);
  await sql`ALTER TABLE albums DROP COLUMN IF EXISTS dynamic`.execute(db);
}
