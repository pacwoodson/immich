import { goto } from '$app/navigation';
import { AppRoute } from '$lib/constants';
import { modalManager } from '$lib/managers/modal-manager.svelte';
import { t } from 'svelte-i18n';
import { get } from 'svelte/store';
import { createDynamicAlbum, type CreateDynamicAlbumDto, type DynamicAlbumResponseDto } from './dynamic-album-api';

/**
 * -------------------------
 * Dynamic Albums General Management
 * -------------------------
 */
export const createDynamicAlbumAndRedirect = async (dto?: CreateDynamicAlbumDto) => {
  if (dto) {
    const newDynamicAlbum = await createDynamicAlbum(dto);
    if (newDynamicAlbum) {
      await goto(`${AppRoute.DYNAMIC_ALBUMS}/${newDynamicAlbum.id}`);
    }
  } else {
    // Open create modal
    // TODO: Implement create modal
    console.log('Create dynamic album modal not implemented yet');
  }
};

export const confirmDynamicAlbumDelete = async (dynamicAlbum: DynamicAlbumResponseDto) => {
  const $t = get(t);
  return await modalManager.showDialog({
    prompt: $t('delete_dynamic_album_prompt', { values: { name: dynamicAlbum.name } }),
    title: $t('delete_dynamic_album'),
    confirmText: $t('delete'),
    cancelText: $t('cancel'),
  });
};
