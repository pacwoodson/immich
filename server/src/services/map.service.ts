import { Injectable } from '@nestjs/common';
import { AuthDto } from 'src/dtos/auth.dto';
import { MapMarkerDto, MapMarkerResponseDto, MapReverseGeocodeDto } from 'src/dtos/map.dto';
import { BaseService } from 'src/services/base.service';
import { getMyPartnerIds } from 'src/utils/asset.util';

@Injectable()
export class MapService extends BaseService {
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
        // Convert album filters to search options
        const searchOptions = this.convertFiltersToSearchOptions(album.filters, album.ownerId);

        // Add map-specific options
        const mapSearchOptions = {
          ...searchOptions,
          // Only include assets with GPS coordinates
          withExif: true,
          // Apply map-specific filters
          isArchived: options.isArchived,
          isFavorite: options.isFavorite,
          fileCreatedAfter: options.fileCreatedAfter,
          fileCreatedBefore: options.fileCreatedBefore,
        };

        // Get assets for this dynamic album using search
        const searchResult = await this.searchRepository.searchMetadata(
          { page: 1, size: 50000 }, // Large page size to get all matching assets
          mapSearchOptions,
        );

        // Filter assets to only include those with GPS coordinates and convert to map markers
        const markers = searchResult.items
          .filter((asset: any) => asset.exif?.latitude && asset.exif?.longitude)
          .map((asset: any) => ({
            id: asset.id,
            lat: asset.exif.latitude,
            lon: asset.exif.longitude,
            city: asset.exif.city || null,
            state: asset.exif.state || null,
            country: asset.exif.country || null,
          }));

        allMarkers.push(...markers);
      } catch (error) {
        this.logger.error(`Failed to get map markers for dynamic album ${album.id}`, error);
        // Continue with other albums even if one fails
      }
    }

    return allMarkers;
  }

  /**
   * Convert dynamic album filters to search options for SearchRepository
   */
  private convertFiltersToSearchOptions(filters: any, userId: string): any {
    const searchOptions: any = {
      userIds: [userId],
      withDeleted: false,
    };

    // Handle the actual filter structure: {tags: [...], operator: "and", ...}
    if (filters.tags && Array.isArray(filters.tags)) {
      searchOptions.tagIds = filters.tags;
      // Include the operator for tag filtering
      if (filters.operator) {
        searchOptions.tagOperator = filters.operator;
      }
    }

    if (filters.people && Array.isArray(filters.people)) {
      searchOptions.personIds = filters.people;
    }

    if (filters.location) {
      if (typeof filters.location === 'string') {
        searchOptions.city = filters.location;
      } else if (typeof filters.location === 'object') {
        if (filters.location.city) searchOptions.city = filters.location.city;
        if (filters.location.state) searchOptions.state = filters.location.state;
        if (filters.location.country) searchOptions.country = filters.location.country;
      }
    }

    if (filters.dateRange && typeof filters.dateRange === 'object') {
      if (filters.dateRange.start) {
        searchOptions.takenAfter = new Date(filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        searchOptions.takenBefore = new Date(filters.dateRange.end);
      }
    }

    if (filters.assetType) {
      if (filters.assetType === 'IMAGE' || filters.assetType === 'VIDEO') {
        searchOptions.type = filters.assetType;
      }
    }

    return searchOptions;
  }

  async reverseGeocode(dto: MapReverseGeocodeDto) {
    const { lat: latitude, lon: longitude } = dto;
    // eventually this should probably return an array of results
    const result = await this.mapRepository.reverseGeocode({ latitude, longitude });
    return result ? [result] : [];
  }
}
