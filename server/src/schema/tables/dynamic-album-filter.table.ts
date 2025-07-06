import { DynamicAlbumFilterType } from 'src/enum';
import { dynamic_album_filter_type_enum } from 'src/schema/enums';
import { DynamicAlbumTable } from 'src/schema/tables/dynamic-album.table';
import {
  Column,
  CreateDateColumn,
  ForeignKeyColumn,
  Generated,
  PrimaryGeneratedColumn,
  Table,
  Timestamp,
} from 'src/sql-tools';

@Table({ name: 'dynamic_album_filters', primaryConstraintName: 'PK_dynamic_album_filters' })
export class DynamicAlbumFilterTable {
  @PrimaryGeneratedColumn()
  id!: Generated<string>;

  @ForeignKeyColumn(() => DynamicAlbumTable, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: false })
  dynamicAlbumId!: string;

  @Column({ enum: dynamic_album_filter_type_enum, nullable: false })
  filterType!: DynamicAlbumFilterType;

  @Column({ type: 'jsonb', nullable: false })
  filterValue!: object;

  @CreateDateColumn()
  createdAt!: Generated<Timestamp>;
} 