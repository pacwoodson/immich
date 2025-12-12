<script lang="ts">
  import AlbumCover from '$lib/components/album-page/album-cover.svelte';
  import FilterDisplay from '$lib/components/album-page/filter-display.svelte';
  import DynamicAlbumFiltersModal from '$lib/modals/DynamicAlbumFiltersModal.svelte';
  import { handleError } from '$lib/utils/handle-error';
  import { updateAlbumInfo, type AlbumResponseDto } from '@immich/sdk';
  import { Button, Field, HStack, Icon, Input, Modal, ModalBody, ModalFooter, Textarea, modalManager } from '@immich/ui';
  import { mdiFilterOutline, mdiRenameOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';

  type Props = {
    album: AlbumResponseDto;
    onClose: (album?: AlbumResponseDto) => void;
  };

  let { album = $bindable(), onClose }: Props = $props();

  let albumName = $state(album.albumName);
  let description = $state(album.description);
  let isSubmitting = $state(false);

  const handleSubmit = async (event: Event) => {
    event.preventDefault();

    isSubmitting = true;

    try {
      await updateAlbumInfo({ id: album.id, updateAlbumDto: { albumName, description } });
      album.albumName = albumName;
      album.description = description;
      onClose(album);
    } catch (error) {
      handleError(error, $t('errors.unable_to_update_album_info'));
    } finally {
      isSubmitting = false;
    }
  };

  const handleEditFilters = async () => {
    const updatedAlbum = await modalManager.show(DynamicAlbumFiltersModal, {
      albumId: album.id,
      initialFilters: album.filters as any,
      albumName: album.albumName,
      description: album.description,
    });
    if (updatedAlbum) {
      // Update the local album object with the new values
      album.filters = updatedAlbum.filters;
      album.albumName = updatedAlbum.albumName;
      album.description = updatedAlbum.description;
      // Update the local state to match
      albumName = updatedAlbum.albumName;
      description = updatedAlbum.description || '';
    }
  };
</script>

<Modal icon={mdiRenameOutline} title={$t('edit_album')} size="medium" {onClose}>
  <ModalBody>
    <form onsubmit={handleSubmit} autocomplete="off" id="edit-album-form">
      <div class="flex items-center gap-8 m-4">
        <AlbumCover {album} class="h-50 w-50 shadow-lg hidden sm:flex" />

        <div class="grow flex flex-col gap-4">
          <Field label={$t('name')}>
            <Input bind:value={albumName} />
          </Field>

          <Field label={$t('description')}>
            <Textarea bind:value={description} />
          </Field>

          {#if album.dynamic}
            <div class="flex items-center gap-2 pt-2 pb-1 border-t border-gray-200 dark:border-gray-700">
              <Icon icon={mdiFilterOutline} size="18" />
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{$t('dynamic_album')}</span>
            </div>

            {#if album.filters}
              <FilterDisplay filters={album.filters} compact={true} />
            {/if}

            <Button
              leadingIcon={mdiFilterOutline}
              onclick={handleEditFilters}
              size="small"
              variant="outline"
              color="primary"
              fullWidth
            >
              {$t('edit_filters')}
            </Button>
          {/if}
        </div>
      </div>
    </form>
  </ModalBody>

  <ModalFooter>
    <HStack fullWidth>
      <Button shape="round" color="secondary" fullWidth onclick={() => onClose()}>{$t('cancel')}</Button>
      <Button shape="round" type="submit" fullWidth disabled={isSubmitting} form="edit-album-form">{$t('save')}</Button>
    </HStack>
  </ModalFooter>
</Modal>
