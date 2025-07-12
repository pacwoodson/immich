<script lang="ts">
  import TagSelector from '$lib/components/shared-components/tag-selector.svelte';
  import {
    notificationController,
    NotificationType,
  } from '$lib/components/shared-components/notification/notification';
  import { handleError } from '$lib/utils/handle-error';
  import { createDynamicAlbum, type DynamicAlbumResponseDto } from '@immich/sdk';
  import { Button, HStack, Modal, ModalBody, ModalFooter } from '@immich/ui';
  import { mdiFolderOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import { SvelteSet } from 'svelte/reactivity';

  interface Props {
    onClose: (album?: DynamicAlbumResponseDto) => void;
  }

  let { onClose }: Props = $props();

  let albumName = $state('');
  let selectedTagIds = new SvelteSet<string>();
  let isSubmitting = $state(false);
  let disabled = $derived(isSubmitting || !albumName.trim() || selectedTagIds.size === 0);

  const handleSubmit = async () => {
    if (!albumName.trim() || selectedTagIds.size === 0) {
      return;
    }

    isSubmitting = true;
    try {
      const album = await createDynamicAlbum({
        createDynamicAlbumDto: {
          name: albumName.trim(),
          filters: [
            {
              type: 'tag',
              value: {
                tagIds: [...selectedTagIds],
                operator: 'and',
              },
            },
          ],
        },
      });

      notificationController.show({
        message: $t('dynamic_album_created', { values: { album: album.name } }),
        type: NotificationType.Info,
      });

      onClose(album);
    } catch (error) {
      handleError(error, $t('errors.failed_to_create_dynamic_album'));
    } finally {
      isSubmitting = false;
    }
  };

  const onsubmit = async (event: Event) => {
    event.preventDefault();
    await handleSubmit();
  };
</script>

<Modal size="medium" title={$t('create_dynamic_album')} icon={mdiFolderOutline} {onClose}>
  <ModalBody>
    <div class="text-immich-primary dark:text-immich-dark-primary">
      <p class="text-sm dark:text-immich-dark-fg mb-4">
        {$t('create_dynamic_album_description')}
      </p>
    </div>

    <form {onsubmit} autocomplete="off" id="create-dynamic-album-form">
      <!-- Album Name -->
      <div class="my-4 flex flex-col gap-2">
        <label class="immich-form-label" for="album-name">{$t('name')}</label>
        <input
          class="immich-form-input"
          id="album-name"
          type="text"
          bind:value={albumName}
          placeholder={$t('enter_album_name')}
          required
          autofocus
        />
      </div>

      <!-- Tag Selection -->
      <TagSelector bind:selectedTagIds />
    </form>
  </ModalBody>

  <ModalFooter>
    <HStack fullWidth>
      <Button shape="round" color="secondary" fullWidth onclick={() => onClose()}>{$t('cancel')}</Button>
      <Button type="submit" shape="round" fullWidth form="create-dynamic-album-form" {disabled}>
        {$t('create')}
      </Button>
    </HStack>
  </ModalFooter>
</Modal>
