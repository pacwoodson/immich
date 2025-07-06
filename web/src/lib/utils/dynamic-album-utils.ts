import { goto } from '$app/navigation';
import { notificationController, NotificationType } from '$lib/components/shared-components/notification/notification';
import { AppRoute } from '$lib/constants';
import { modalManager } from '$lib/managers/modal-manager.svelte';
import CreateDynamicAlbumModal from '$lib/modals/CreateDynamicAlbumModal.svelte';
import * as sdk from '@immich/sdk';
import { t } from 'svelte-i18n';
import { get } from 'svelte/store';

/**
 * -------------------------
 * Dynamic Albums General Management
 * -------------------------
 */
export const createDynamicAlbumAndRedirect = async (dto?: sdk.CreateDynamicAlbumDto) => {
  if (dto) {
    try {
      const newDynamicAlbum = await sdk.createDynamicAlbum({ createDynamicAlbumDto: dto });
      if (newDynamicAlbum) {
        await goto(`${AppRoute.DYNAMIC_ALBUMS}/${newDynamicAlbum.id}`);
      }
    } catch (error) {
      const $t = get(t);
      console.error('Error creating dynamic album:', error);
      notificationController.show({
        message: $t('errors.failed_to_create_dynamic_album'),
        type: NotificationType.Error,
      });
    }
  } else {
    // Open create modal
    const album = await modalManager.show(CreateDynamicAlbumModal);
    if (album) {
      await goto(`${AppRoute.DYNAMIC_ALBUMS}/${album.id}`);
    }
  }
};

export const confirmDynamicAlbumDelete = async (dynamicAlbum: sdk.DynamicAlbumResponseDto) => {
  const $t = get(t);
  return await modalManager.showDialog({
    prompt: $t('delete_dynamic_album_prompt', { values: { name: dynamicAlbum.name } }),
    title: $t('delete_dynamic_album'),
    confirmText: $t('delete'),
    cancelText: $t('cancel'),
  });
};

/**
 * Create a new dynamic album and redirect to it
 */
export const createAndGoToDynamicAlbum = async (name: string, tagIds: string[]): Promise<void> => {
  try {
    const $t = get(t);

    const dynamicAlbum = await sdk.createDynamicAlbum({
      createDynamicAlbumDto: {
        name,
        filters: [
          {
            type: 'tag' as sdk.Type,
            value: { tagIds, operator: 'and' },
          },
        ],
      },
    });

    notificationController.show({
      message: $t('dynamic_album_created', { values: { album: dynamicAlbum.name } }),
      type: NotificationType.Info,
    });

    await goto(`${AppRoute.DYNAMIC_ALBUMS}/${dynamicAlbum.id}`);
  } catch (error) {
    const $t = get(t);
    console.error('Error creating dynamic album:', error);
    notificationController.show({
      message: $t('errors.failed_to_create_dynamic_album'),
      type: NotificationType.Error,
    });
  }
};
