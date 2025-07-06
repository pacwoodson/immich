import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create dynamic_album_filter_type_enum
  await sql`CREATE TYPE "dynamic_album_filter_type_enum" AS ENUM ('tag', 'person', 'location', 'date_range', 'asset_type', 'metadata')`.execute(db);

  // Create dynamic_albums table
  await sql`CREATE TABLE "dynamic_albums" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "ownerId" uuid NOT NULL,
    "name" character varying NOT NULL DEFAULT 'Untitled Dynamic Album',
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "albumThumbnailAssetId" uuid,
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "description" text NOT NULL DEFAULT '',
    "deletedAt" timestamp with time zone,
    "isActivityEnabled" boolean NOT NULL DEFAULT true,
    "order" character varying NOT NULL DEFAULT 'desc',
    "updateId" uuid NOT NULL DEFAULT immich_uuid_v7()
  )`.execute(db);

  // Add comment for thumbnail column
  await sql`COMMENT ON COLUMN "dynamic_albums"."albumThumbnailAssetId" IS 'Asset ID to be used as thumbnail'`.execute(db);

  // Create dynamic_album_filters table
  await sql`CREATE TABLE "dynamic_album_filters" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "dynamicAlbumId" uuid NOT NULL,
    "filterType" dynamic_album_filter_type_enum NOT NULL,
    "filterValue" jsonb NOT NULL,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now()
  )`.execute(db);

  // Create dynamic_album_shares table
  await sql`CREATE TABLE "dynamic_album_shares" (
    "dynamicAlbumId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "role" character varying NOT NULL DEFAULT 'editor',
    "createdAt" timestamp with time zone NOT NULL DEFAULT now()
  )`.execute(db);

  // Create audit tables
  await sql`CREATE TABLE "dynamic_albums_audit" (
    "id" uuid NOT NULL DEFAULT immich_uuid_v7(),
    "albumId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "deletedAt" timestamp with time zone NOT NULL DEFAULT clock_timestamp()
  )`.execute(db);

  await sql`CREATE TABLE "dynamic_album_shares_audit" (
    "id" uuid NOT NULL DEFAULT immich_uuid_v7(),
    "albumId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "deletedAt" timestamp with time zone NOT NULL DEFAULT clock_timestamp()
  )`.execute(db);

  // Add primary key constraints
  await sql`ALTER TABLE "dynamic_albums" ADD CONSTRAINT "PK_dynamic_albums" PRIMARY KEY ("id")`.execute(db);
  await sql`ALTER TABLE "dynamic_album_filters" ADD CONSTRAINT "PK_dynamic_album_filters" PRIMARY KEY ("id")`.execute(db);
  await sql`ALTER TABLE "dynamic_album_shares" ADD CONSTRAINT "PK_dynamic_album_shares" PRIMARY KEY ("dynamicAlbumId", "userId")`.execute(db);
  await sql`ALTER TABLE "dynamic_albums_audit" ADD CONSTRAINT "PK_dynamic_albums_audit" PRIMARY KEY ("id")`.execute(db);
  await sql`ALTER TABLE "dynamic_album_shares_audit" ADD CONSTRAINT "PK_dynamic_album_shares_audit" PRIMARY KEY ("id")`.execute(db);

  // Add foreign key constraints
  await sql`ALTER TABLE "dynamic_albums" ADD CONSTRAINT "FK_dynamic_albums_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`.execute(db);
  await sql`ALTER TABLE "dynamic_albums" ADD CONSTRAINT "FK_dynamic_albums_thumbnail" FOREIGN KEY ("albumThumbnailAssetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE`.execute(db);
  await sql`ALTER TABLE "dynamic_album_filters" ADD CONSTRAINT "FK_dynamic_album_filters_album" FOREIGN KEY ("dynamicAlbumId") REFERENCES "dynamic_albums"("id") ON DELETE CASCADE ON UPDATE CASCADE`.execute(db);
  await sql`ALTER TABLE "dynamic_album_shares" ADD CONSTRAINT "FK_dynamic_album_shares_album" FOREIGN KEY ("dynamicAlbumId") REFERENCES "dynamic_albums"("id") ON DELETE CASCADE ON UPDATE CASCADE`.execute(db);
  await sql`ALTER TABLE "dynamic_album_shares" ADD CONSTRAINT "FK_dynamic_album_shares_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`.execute(db);

  // Add indexes
  await sql`CREATE INDEX "IDX_dynamic_albums_update_id" ON "dynamic_albums" ("updateId")`.execute(db);
  await sql`CREATE INDEX "IDX_dynamic_albums_owner" ON "dynamic_albums" ("ownerId")`.execute(db);
  await sql`CREATE INDEX "IDX_dynamic_albums_deleted" ON "dynamic_albums" ("deletedAt")`.execute(db);
  await sql`CREATE INDEX "IDX_dynamic_album_filters_album" ON "dynamic_album_filters" ("dynamicAlbumId")`.execute(db);
  await sql`CREATE INDEX "IDX_dynamic_album_shares_album" ON "dynamic_album_shares" ("dynamicAlbumId")`.execute(db);
  await sql`CREATE INDEX "IDX_dynamic_album_shares_user" ON "dynamic_album_shares" ("userId")`.execute(db);
  await sql`CREATE INDEX "IDX_dynamic_albums_audit_album_id" ON "dynamic_albums_audit" ("albumId")`.execute(db);
  await sql`CREATE INDEX "IDX_dynamic_albums_audit_user_id" ON "dynamic_albums_audit" ("userId")`.execute(db);
  await sql`CREATE INDEX "IDX_dynamic_albums_audit_deleted_at" ON "dynamic_albums_audit" ("deletedAt")`.execute(db);
  await sql`CREATE INDEX "IDX_dynamic_album_shares_audit_album_id" ON "dynamic_album_shares_audit" ("albumId")`.execute(db);
  await sql`CREATE INDEX "IDX_dynamic_album_shares_audit_user_id" ON "dynamic_album_shares_audit" ("userId")`.execute(db);
  await sql`CREATE INDEX "IDX_dynamic_album_shares_audit_deleted_at" ON "dynamic_album_shares_audit" ("deletedAt")`.execute(db);

  // Create updated_at trigger for dynamic_albums
  await sql`CREATE OR REPLACE TRIGGER "dynamic_albums_updated_at"
    BEFORE UPDATE ON "dynamic_albums"
    FOR EACH ROW
    EXECUTE FUNCTION updated_at()`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop triggers
  await sql`DROP TRIGGER IF EXISTS "dynamic_albums_updated_at" ON "dynamic_albums"`.execute(db);

  // Drop indexes
  await sql`DROP INDEX IF EXISTS "IDX_dynamic_albums_update_id"`.execute(db);
  await sql`DROP INDEX IF EXISTS "IDX_dynamic_albums_owner"`.execute(db);
  await sql`DROP INDEX IF EXISTS "IDX_dynamic_albums_deleted"`.execute(db);
  await sql`DROP INDEX IF EXISTS "IDX_dynamic_album_filters_album"`.execute(db);
  await sql`DROP INDEX IF EXISTS "IDX_dynamic_album_shares_album"`.execute(db);
  await sql`DROP INDEX IF EXISTS "IDX_dynamic_album_shares_user"`.execute(db);
  await sql`DROP INDEX IF EXISTS "IDX_dynamic_albums_audit_album_id"`.execute(db);
  await sql`DROP INDEX IF EXISTS "IDX_dynamic_albums_audit_user_id"`.execute(db);
  await sql`DROP INDEX IF EXISTS "IDX_dynamic_albums_audit_deleted_at"`.execute(db);
  await sql`DROP INDEX IF EXISTS "IDX_dynamic_album_shares_audit_album_id"`.execute(db);
  await sql`DROP INDEX IF EXISTS "IDX_dynamic_album_shares_audit_user_id"`.execute(db);
  await sql`DROP INDEX IF EXISTS "IDX_dynamic_album_shares_audit_deleted_at"`.execute(db);

  // Drop foreign key constraints
  await sql`ALTER TABLE "dynamic_album_shares" DROP CONSTRAINT IF EXISTS "FK_dynamic_album_shares_user"`.execute(db);
  await sql`ALTER TABLE "dynamic_album_shares" DROP CONSTRAINT IF EXISTS "FK_dynamic_album_shares_album"`.execute(db);
  await sql`ALTER TABLE "dynamic_album_filters" DROP CONSTRAINT IF EXISTS "FK_dynamic_album_filters_album"`.execute(db);
  await sql`ALTER TABLE "dynamic_albums" DROP CONSTRAINT IF EXISTS "FK_dynamic_albums_thumbnail"`.execute(db);
  await sql`ALTER TABLE "dynamic_albums" DROP CONSTRAINT IF EXISTS "FK_dynamic_albums_owner"`.execute(db);

  // Drop primary key constraints
  await sql`ALTER TABLE "dynamic_album_shares_audit" DROP CONSTRAINT IF EXISTS "PK_dynamic_album_shares_audit"`.execute(db);
  await sql`ALTER TABLE "dynamic_albums_audit" DROP CONSTRAINT IF EXISTS "PK_dynamic_albums_audit"`.execute(db);
  await sql`ALTER TABLE "dynamic_album_shares" DROP CONSTRAINT IF EXISTS "PK_dynamic_album_shares"`.execute(db);
  await sql`ALTER TABLE "dynamic_album_filters" DROP CONSTRAINT IF EXISTS "PK_dynamic_album_filters"`.execute(db);
  await sql`ALTER TABLE "dynamic_albums" DROP CONSTRAINT IF EXISTS "PK_dynamic_albums"`.execute(db);

  // Drop tables
  await sql`DROP TABLE IF EXISTS "dynamic_album_shares_audit"`.execute(db);
  await sql`DROP TABLE IF EXISTS "dynamic_albums_audit"`.execute(db);
  await sql`DROP TABLE IF EXISTS "dynamic_album_shares"`.execute(db);
  await sql`DROP TABLE IF EXISTS "dynamic_album_filters"`.execute(db);
  await sql`DROP TABLE IF EXISTS "dynamic_albums"`.execute(db);

  // Drop enum
  await sql`DROP TYPE IF EXISTS "dynamic_album_filter_type_enum"`.execute(db);
} 