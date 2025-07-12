import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsObject, IsString, ValidateNested } from 'class-validator';
import { AssetOrder, DynamicAlbumFilterType, DynamicAlbumUserRole } from 'src/enum';
import { Optional, ValidateUUID } from 'src/validation';

export class DynamicAlbumFilterDto {
  @ApiProperty({ enum: DynamicAlbumFilterType })
  @IsNotEmpty()
  type!: DynamicAlbumFilterType;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  value!: object;
}

export class CreateDynamicAlbumDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ required: false })
  @IsString()
  @Optional()
  description?: string;

  @ApiProperty({ type: [DynamicAlbumFilterDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DynamicAlbumFilterDto)
  filters!: DynamicAlbumFilterDto[];

  @ApiProperty({ enum: AssetOrder, required: false })
  @Optional()
  order?: AssetOrder;

  @ApiProperty({ required: false })
  @IsBoolean()
  @Optional()
  isActivityEnabled?: boolean;
}

export class UpdateDynamicAlbumDto {
  @ApiProperty({ required: false })
  @IsString()
  @Optional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @Optional()
  description?: string;

  @ApiProperty({ type: [DynamicAlbumFilterDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DynamicAlbumFilterDto)
  @Optional()
  filters?: DynamicAlbumFilterDto[];

  @ApiProperty({ enum: AssetOrder, required: false })
  @Optional()
  order?: AssetOrder;

  @ApiProperty({ required: false })
  @IsBoolean()
  @Optional()
  isActivityEnabled?: boolean;

  @ApiProperty({ required: false })
  @ValidateUUID({ optional: true })
  albumThumbnailAssetId?: string;
}

export class DynamicAlbumShareDto {
  @ApiProperty()
  @ValidateUUID()
  userId!: string;

  @ApiProperty({ enum: DynamicAlbumUserRole, enumName: 'DynamicAlbumUserRole' })
  role!: DynamicAlbumUserRole;

  @ApiProperty()
  createdAt!: Date;
}

export class DynamicAlbumResponseDto {
  @ApiProperty()
  @ValidateUUID()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  @ValidateUUID()
  ownerId!: string;

  @ApiProperty({ type: [DynamicAlbumFilterDto] })
  filters!: DynamicAlbumFilterDto[];

  @ApiProperty()
  assetCount!: number;

  @ApiProperty({ required: false })
  startDate?: Date;

  @ApiProperty({ required: false })
  endDate?: Date;

  @ApiProperty({ required: false })
  @ValidateUUID({ optional: true })
  albumThumbnailAssetId?: string;

  @ApiProperty({ enum: AssetOrder })
  order!: AssetOrder;

  @ApiProperty()
  isActivityEnabled!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: [DynamicAlbumShareDto] })
  sharedUsers!: DynamicAlbumShareDto[];
}

export class DynamicAlbumAssetCountDto {
  @ApiProperty()
  @ValidateUUID()
  dynamicAlbumId!: string;

  @ApiProperty()
  assetCount!: number;

  @ApiProperty({ required: false })
  startDate?: Date;

  @ApiProperty({ required: false })
  endDate?: Date;
}

export class ShareDynamicAlbumDto {
  @ApiProperty()
  @ValidateUUID()
  userId!: string;

  @ApiProperty({ enum: DynamicAlbumUserRole, enumName: 'DynamicAlbumUserRole' })
  role!: DynamicAlbumUserRole;
}

export class UpdateDynamicAlbumShareDto {
  @ApiProperty({ enum: DynamicAlbumUserRole, enumName: 'DynamicAlbumUserRole' })
  role!: DynamicAlbumUserRole;
}
