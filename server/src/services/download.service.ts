import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'node:path';
import { StorageCore } from 'src/cores/storage.core';
import { AssetIdsDto } from 'src/dtos/asset.dto';
import { AuthDto } from 'src/dtos/auth.dto';
import { DownloadArchiveInfo, DownloadInfoDto, DownloadResponseDto } from 'src/dtos/download.dto';
import { Permission } from 'src/enum';
import { ImmichReadStream } from 'src/repositories/storage.repository';
import { BaseService } from 'src/services/base.service';
import { DynamicAlbumFilters } from 'src/types/dynamic-album.types';
import { HumanReadableSize } from 'src/utils/bytes';
import { getPreferences } from 'src/utils/preferences';

@Injectable()
export class DownloadService extends BaseService {
  /**
   * Get assets for a dynamic album as an async generator
   * This provides the same interface as the download repository methods (streaming)
   * while supporting pagination for large dynamic albums
   */
  private async *getDynamicAlbumAssets(
    filters: DynamicAlbumFilters,
    ownerId: string,
  ): AsyncGenerator<{ id: string; livePhotoVideoId: string | null; size: number | null }> {
    const pageSize = 1000; // Process in chunks to handle large albums
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      try {
        // Fetch a page of assets to get their IDs
        const result = await this.dynamicAlbumRepository.getAssets(filters, ownerId, {
          page,
          size: pageSize,
        });

        const assets = result.items || [];
        hasNextPage = result.hasNextPage;

        if (assets.length === 0) {
          break;
        }

        // Get the asset IDs
        const assetIds = assets.map((asset) => asset.id);

        // Use the download repository to get assets with proper exif data
        // This ensures we have the correct file size and other metadata
        const downloadAssets = this.downloadRepository.downloadAssetIds(assetIds);

        for await (const asset of downloadAssets) {
          yield asset;
        }

        page++;
      } catch (error) {
        this.logger.error(`Failed to fetch dynamic album assets: ${error}`, error);
        // Stop iteration on error
        return;
      }
    }
  }

  async getDownloadInfo(auth: AuthDto, dto: DownloadInfoDto): Promise<DownloadResponseDto> {
    let assets;

    if (dto.assetIds) {
      const assetIds = dto.assetIds;
      await this.requireAccess({ auth, permission: Permission.AssetDownload, ids: assetIds });
      assets = this.downloadRepository.downloadAssetIds(assetIds);
    } else if (dto.albumId) {
      const albumId = dto.albumId;
      await this.requireAccess({ auth, permission: Permission.AlbumDownload, ids: [albumId] });

      // Check if the album is dynamic
      const album = await this.albumRepository.getById(albumId, { withAssets: false });
      if (album && album.dynamic && album.filters) {
        // For dynamic albums, compute assets based on filters
        assets = this.getDynamicAlbumAssets(album.filters as DynamicAlbumFilters, album.ownerId);
      } else {
        // For regular albums, use the standard repository method
        assets = this.downloadRepository.downloadAlbumId(albumId);
      }
    } else if (dto.userId) {
      const userId = dto.userId;
      await this.requireAccess({ auth, permission: Permission.TimelineDownload, ids: [userId] });
      assets = this.downloadRepository.downloadUserId(userId);
    } else {
      throw new BadRequestException('assetIds, albumId, or userId is required');
    }

    const targetSize = dto.archiveSize || HumanReadableSize.GiB * 4;
    const metadata = await this.userRepository.getMetadata(auth.user.id);
    const preferences = getPreferences(metadata);
    const motionIds = new Set<string>();
    const archives: DownloadArchiveInfo[] = [];
    let archive: DownloadArchiveInfo = { size: 0, assetIds: [] };

    const addToArchive = ({ id, size }: { id: string; size: number | null }) => {
      archive.assetIds.push(id);
      archive.size += Number(size || 0);

      if (archive.size > targetSize) {
        archives.push(archive);
        archive = { size: 0, assetIds: [] };
      }
    };

    for await (const asset of assets) {
      // motion part of live photos
      if (asset.livePhotoVideoId) {
        motionIds.add(asset.livePhotoVideoId);
      }

      addToArchive(asset);
    }

    if (motionIds.size > 0) {
      const motionAssets = this.downloadRepository.downloadMotionAssetIds([...motionIds]);
      for await (const motionAsset of motionAssets) {
        if (StorageCore.isAndroidMotionPath(motionAsset.originalPath) && !preferences.download.includeEmbeddedVideos) {
          continue;
        }

        addToArchive(motionAsset);
      }
    }

    if (archive.assetIds.length > 0) {
      archives.push(archive);
    }

    let totalSize = 0;
    for (const archive of archives) {
      totalSize += archive.size;
    }

    return { totalSize, archives };
  }

  async downloadArchive(auth: AuthDto, dto: AssetIdsDto): Promise<ImmichReadStream> {
    await this.requireAccess({ auth, permission: Permission.AssetDownload, ids: dto.assetIds });

    const zip = this.storageRepository.createZipStream();
    const assets = await this.assetRepository.getByIds(dto.assetIds);
    const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
    const paths: Record<string, number> = {};

    for (const assetId of dto.assetIds) {
      const asset = assetMap.get(assetId);
      if (!asset) {
        continue;
      }

      const { originalPath, originalFileName } = asset;

      let filename = originalFileName;
      const count = paths[filename] || 0;
      paths[filename] = count + 1;
      if (count !== 0) {
        const parsedFilename = parse(originalFileName);
        filename = `${parsedFilename.name}+${count}${parsedFilename.ext}`;
      }

      let realpath = originalPath;
      try {
        realpath = await this.storageRepository.realpath(originalPath);
      } catch {
        this.logger.warn('Unable to resolve realpath', { originalPath });
      }

      zip.addFile(realpath, filename);
    }

    void zip.finalize();

    return { stream: zip.stream };
  }
}
