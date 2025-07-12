import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceAlbumsWithDynamicFiltering1751500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add dynamic boolean field to albums table
    await queryRunner.query(`
      ALTER TABLE albums 
      ADD COLUMN dynamic boolean DEFAULT false NOT NULL
    `);

    // Add filters JSONB field to albums table
    await queryRunner.query(`
      ALTER TABLE albums 
      ADD COLUMN filters jsonb DEFAULT null
    `);

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX IDX_albums_dynamic ON albums(dynamic)
    `);

    await queryRunner.query(`
      CREATE INDEX IDX_albums_filters ON albums USING gin(filters)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove indexes
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_albums_dynamic`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_albums_filters`);

    // Remove columns
    await queryRunner.query(`ALTER TABLE albums DROP COLUMN IF EXISTS filters`);
    await queryRunner.query(`ALTER TABLE albums DROP COLUMN IF EXISTS dynamic`);
  }
}
