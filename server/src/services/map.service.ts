import { Injectable } from '@nestjs/common';
import { AuthDto } from 'src/dtos/auth.dto';
import { MapMarkerDto, MapMarkerResponseDto, MapReverseGeocodeDto } from 'src/dtos/map.dto';
import { BaseService } from 'src/services/base.service';
import { DynamicAlbumService } from 'src/services/dynamic-album.service';
import { getMyPartnerIds } from 'src/utils/asset.util';

@Injectable()
export class MapService extends BaseService {
  constructor(
    private dynamicAlbumService: DynamicAlbumService,
    ...args: ConstructorParameters<typeof BaseService>
  ) {
    super(...args);
  }

  async getMapMarkers(auth: AuthDto, options: MapMarkerDto): Promise<MapMarkerResponseDto[]> {
    const userIds = [auth.user.id];
    if (options.withPartners) {
      const partnerIds = await getMyPartnerIds({ userId: auth.user.id, repository: this.partnerRepository });
      userIds.push(...partnerIds);
    }

    // Handle albums - separate regular and dynamic albums
    const regularAlbumIds: string[] = [];
    const dynamicAlbums: Array<{ id: string; filters: any; ownerId: string }> = [];

    if (options.withSharedAlbums) {
      const [ownedAlbums, sharedAlbums] = await Promise.all([
        this.albumRepository.getOwned(auth.user.id),
        this.albumRepository.getShared(auth.user.id),
      ]);

      // Separate regular and dynamic albums
      for (const album of [...ownedAlbums, ...sharedAlbums]) {
        if (album.dynamic && album.filters) {
          dynamicAlbums.push({
            id: album.id,
            filters: album.filters,
            ownerId: album.ownerId,
          });
        } else {
          regularAlbumIds.push(album.id);
        }
      }
    }

    // Get map markers for regular albums
    const regularAlbumMarkers = await this.mapRepository.getMapMarkers(userIds, regularAlbumIds, options);

    // Get map markers for dynamic albums using search functionality
    const dynamicAlbumMarkers = await this.getMapMarkersForDynamicAlbums(dynamicAlbums, options);

    // Combine and return all markers
    return [...regularAlbumMarkers, ...dynamicAlbumMarkers];
  }

  private async getMapMarkersForDynamicAlbums(
    dynamicAlbums: Array<{ id: string; filters: any; ownerId: string }>,
    options: MapMarkerDto,
  ): Promise<MapMarkerResponseDto[]> {
    if (dynamicAlbums.length === 0) {
      return [];
    }

    const allMarkers: MapMarkerResponseDto[] = [];

    for (const album of dynamicAlbums) {
      try {
        const markers = await this.dynamicAlbumService.getMapMarkers(
          album.filters,
          album.ownerId,
          {
            isArchived: options.isArchived,
            isFavorite: options.isFavorite,
            fileCreatedAfter: options.fileCreatedAfter,
            fileCreatedBefore: options.fileCreatedBefore,
          },
          {
            throwOnError: false, // Don't throw on individual album errors
            timeout: 10000, // 10 second timeout for map operations
          },
        );

        if (markers && Array.isArray(markers)) {
          allMarkers.push(...markers);
        }
      } catch (error) {
        this.logger.warn(`Failed to get map markers for dynamic album ${album.id}:`, error);
        // Continue processing other albums even if one fails
      }
    }

    return allMarkers;
  }

  async reverseGeocode(dto: MapReverseGeocodeDto) {
    const { lat: latitude, lon: longitude } = dto;
    // eventually this should probably return an array of results
    const result = await this.mapRepository.reverseGeocode({ latitude, longitude });
    return result ? [result] : [];
  }
}
