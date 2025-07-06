import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthDto } from 'src/dtos/auth.dto';
import {
  CreateDynamicAlbumDto,
  DynamicAlbumResponseDto,
  ShareDynamicAlbumDto,
  UpdateDynamicAlbumDto,
  UpdateDynamicAlbumShareDto,
} from 'src/dtos/dynamic-album.dto';
import { Permission } from 'src/enum';
import { Auth, Authenticated } from 'src/middleware/auth.guard';
import { DynamicAlbumService } from 'src/services/dynamic-album.service';
import { ParseMeUUIDPipe, UUIDParamDto } from 'src/validation';

@ApiTags('Dynamic Albums')
@Controller('dynamic-albums')
export class DynamicAlbumController {
  constructor(private service: DynamicAlbumService) {}

  @Get()
  @Authenticated({ permission: Permission.ALBUM_READ })
  getAllDynamicAlbums(@Auth() auth: AuthDto): Promise<DynamicAlbumResponseDto[]> {
    return this.service.getAll(auth);
  }

  @Get('shared')
  @Authenticated({ permission: Permission.ALBUM_READ })
  getSharedDynamicAlbums(@Auth() auth: AuthDto): Promise<DynamicAlbumResponseDto[]> {
    return this.service.getShared(auth);
  }

  @Post()
  @Authenticated({ permission: Permission.ALBUM_CREATE })
  createDynamicAlbum(@Auth() auth: AuthDto, @Body() dto: CreateDynamicAlbumDto): Promise<DynamicAlbumResponseDto> {
    return this.service.create(auth, dto);
  }

  @Authenticated({ permission: Permission.ALBUM_READ })
  @Get(':id')
  getDynamicAlbumInfo(@Auth() auth: AuthDto, @Param() { id }: UUIDParamDto): Promise<DynamicAlbumResponseDto> {
    return this.service.get(auth, id);
  }

  @Patch(':id')
  @Authenticated({ permission: Permission.ALBUM_UPDATE })
  updateDynamicAlbumInfo(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
    @Body() dto: UpdateDynamicAlbumDto,
  ): Promise<DynamicAlbumResponseDto> {
    return this.service.update(auth, id, dto);
  }

  @Delete(':id')
  @Authenticated({ permission: Permission.ALBUM_DELETE })
  deleteDynamicAlbum(@Auth() auth: AuthDto, @Param() { id }: UUIDParamDto): Promise<void> {
    return this.service.delete(auth, id);
  }

  @Get(':id/assets')
  @Authenticated({ permission: Permission.ALBUM_READ })
  getDynamicAlbumAssets(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.service.getAssets(auth, id, { skip, take });
  }

  @Get(':id/assets/count')
  @Authenticated({ permission: Permission.ALBUM_READ })
  getDynamicAlbumAssetCount(@Auth() auth: AuthDto, @Param() { id }: UUIDParamDto): Promise<number> {
    return this.service.getAssetCount(auth, id);
  }

  @Post(':id/share')
  @Authenticated({ permission: Permission.ALBUM_SHARE })
  shareDynamicAlbum(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
    @Body() dto: ShareDynamicAlbumDto,
  ): Promise<void> {
    return this.service.share(auth, id, dto);
  }

  @Put(':id/share/:userId')
  @Authenticated({ permission: Permission.ALBUM_SHARE })
  updateDynamicAlbumShare(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
    @Param('userId', new ParseMeUUIDPipe({ version: '4' })) userId: string,
    @Body() dto: UpdateDynamicAlbumShareDto,
  ): Promise<void> {
    return this.service.updateShare(auth, id, userId, dto);
  }

  @Delete(':id/share/:userId')
  @Authenticated({ permission: Permission.ALBUM_SHARE })
  removeDynamicAlbumShare(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
    @Param('userId', new ParseMeUUIDPipe({ version: '4' })) userId: string,
  ): Promise<void> {
    return this.service.removeShare(auth, id, userId);
  }
}
