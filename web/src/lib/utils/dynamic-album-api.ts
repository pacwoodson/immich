import { getBaseUrl } from '@immich/sdk';
import { t } from 'svelte-i18n';
import { get } from 'svelte/store';
import { handleError } from './handle-error';

// Types for dynamic albums
export interface DynamicAlbumFilterDto {
  type: 'TAG' | 'PERSON' | 'LOCATION' | 'DATE_RANGE' | 'ASSET_TYPE' | 'METADATA';
  operator: 'AND' | 'OR';
  value: any;
}

export interface CreateDynamicAlbumDto {
  name: string;
  description?: string;
  filters: DynamicAlbumFilterDto[];
}

export interface UpdateDynamicAlbumDto {
  name?: string;
  description?: string;
  filters?: DynamicAlbumFilterDto[];
}

export interface DynamicAlbumResponseDto {
  id: string;
  name: string;
  description?: string;
  filters: DynamicAlbumFilterDto[];
  ownerId: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  assetCount: number;
  sharedUsers: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

export interface ShareDynamicAlbumDto {
  userId: string;
  permission: 'READ' | 'WRITE' | 'ADMIN';
}

export interface UpdateDynamicAlbumShareDto {
  permission: 'READ' | 'WRITE' | 'ADMIN';
}

// API functions for dynamic albums
const makeRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/dynamic-albums${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
};

// Get all dynamic albums (owned and shared)
export const getAllDynamicAlbums = async (): Promise<DynamicAlbumResponseDto[]> => {
  try {
    return await makeRequest<DynamicAlbumResponseDto[]>('');
  } catch (error) {
    const $t = get(t);
    handleError(error, $t('errors.failed_to_load_dynamic_albums'));
    throw error;
  }
};

// Get shared dynamic albums only
export const getSharedDynamicAlbums = async (): Promise<DynamicAlbumResponseDto[]> => {
  try {
    return await makeRequest<DynamicAlbumResponseDto[]>('/shared');
  } catch (error) {
    const $t = get(t);
    handleError(error, $t('errors.failed_to_load_shared_dynamic_albums'));
    throw error;
  }
};

// Create a new dynamic album
export const createDynamicAlbum = async (dto: CreateDynamicAlbumDto): Promise<DynamicAlbumResponseDto> => {
  try {
    return await makeRequest<DynamicAlbumResponseDto>('', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  } catch (error) {
    const $t = get(t);
    handleError(error, $t('errors.failed_to_create_dynamic_album'));
    throw error;
  }
};

// Get a specific dynamic album
export const getDynamicAlbum = async (id: string): Promise<DynamicAlbumResponseDto> => {
  try {
    return await makeRequest<DynamicAlbumResponseDto>(`/${id}`);
  } catch (error) {
    const $t = get(t);
    handleError(error, $t('errors.failed_to_load_dynamic_album'));
    throw error;
  }
};

// Update a dynamic album
export const updateDynamicAlbum = async (id: string, dto: UpdateDynamicAlbumDto): Promise<DynamicAlbumResponseDto> => {
  try {
    return await makeRequest<DynamicAlbumResponseDto>(`/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  } catch (error) {
    const $t = get(t);
    handleError(error, $t('errors.failed_to_update_dynamic_album'));
    throw error;
  }
};

// Delete a dynamic album
export const deleteDynamicAlbum = async (id: string): Promise<void> => {
  try {
    await makeRequest(`/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    const $t = get(t);
    handleError(error, $t('errors.failed_to_delete_dynamic_album'));
    throw error;
  }
};

// Get assets in a dynamic album
export const getDynamicAlbumAssets = async (
  id: string,
  options: { skip?: number; take?: number } = {},
): Promise<any[]> => {
  try {
    const params = new URLSearchParams();
    if (options.skip !== undefined) params.append('skip', options.skip.toString());
    if (options.take !== undefined) params.append('take', options.take.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `/${id}/assets?${queryString}` : `/${id}/assets`;

    return await makeRequest<any[]>(endpoint);
  } catch (error) {
    const $t = get(t);
    handleError(error, $t('errors.failed_to_load_dynamic_album_assets'));
    throw error;
  }
};

// Get asset count in a dynamic album
export const getDynamicAlbumAssetCount = async (id: string): Promise<number> => {
  try {
    return await makeRequest<number>(`/${id}/assets/count`);
  } catch (error) {
    const $t = get(t);
    handleError(error, $t('errors.failed_to_load_dynamic_album_asset_count'));
    throw error;
  }
};

// Share a dynamic album
export const shareDynamicAlbum = async (id: string, dto: ShareDynamicAlbumDto): Promise<void> => {
  try {
    await makeRequest(`/${id}/share`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  } catch (error) {
    const $t = get(t);
    handleError(error, $t('errors.failed_to_share_dynamic_album'));
    throw error;
  }
};

// Update share permissions
export const updateDynamicAlbumShare = async (
  id: string,
  userId: string,
  dto: UpdateDynamicAlbumShareDto,
): Promise<void> => {
  try {
    await makeRequest(`/${id}/share/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  } catch (error) {
    const $t = get(t);
    handleError(error, $t('errors.failed_to_update_dynamic_album_share'));
    throw error;
  }
};

// Remove share
export const removeDynamicAlbumShare = async (id: string, userId: string): Promise<void> => {
  try {
    await makeRequest(`/${id}/share/${userId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    const $t = get(t);
    handleError(error, $t('errors.failed_to_remove_dynamic_album_share'));
    throw error;
  }
};
