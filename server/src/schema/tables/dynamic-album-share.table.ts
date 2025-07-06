import { DynamicAlbumUserRole } from 'src/enum';
import { DynamicAlbumTable } from 'src/schema/tables/dynamic-album.table';
import { UserTable } from 'src/schema/tables/user.table';
import {
  Column,
  CreateDateColumn,
  ForeignKeyColumn,
  Generated,
  Table,
  Timestamp,
} from 'src/sql-tools';

@Table({ name: 'dynamic_album_shares', primaryConstraintName: 'PK_dynamic_album_shares' })
export class DynamicAlbumShareTable {
  @ForeignKeyColumn(() => DynamicAlbumTable, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: false,
    primary: true,
  })
  dynamicAlbumId!: string;

  @ForeignKeyColumn(() => UserTable, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: false,
    primary: true,
  })
  userId!: string;

  @Column({ type: 'character varying', default: DynamicAlbumUserRole.EDITOR })
  role!: Generated<DynamicAlbumUserRole>;

  @CreateDateColumn()
  createdAt!: Generated<Timestamp>;
} 