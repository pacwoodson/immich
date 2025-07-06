<script lang="ts">
  import Icon from '$lib/components/elements/icon.svelte';
  import Combobox, { type ComboBoxOption } from '$lib/components/shared-components/combobox.svelte';
  import {
    notificationController,
    NotificationType,
  } from '$lib/components/shared-components/notification/notification';
  import { handleError } from '$lib/utils/handle-error';
  import { createDynamicAlbum, getAllTags, type DynamicAlbumResponseDto, type TagResponseDto } from '@immich/sdk';
  import { Button, HStack, Modal, ModalBody, ModalFooter } from '@immich/ui';
  import { mdiClose, mdiFolderOutline } from '@mdi/js';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';
  import { SvelteSet } from 'svelte/reactivity';

  interface Props {
    onClose: (album?: DynamicAlbumResponseDto) => void;
  }

  let { onClose }: Props = $props();

  let albumName = $state('');
  let allTags: TagResponseDto[] = $state([]);
  let tagMap = $derived(Object.fromEntries(allTags.map((tag) => [tag.id, tag])));
  let selectedTagIds = new SvelteSet<string>();
  let isSubmitting = $state(false);
  let disabled = $derived(isSubmitting || !albumName.trim() || selectedTagIds.size === 0);

  onMount(async () => {
    allTags = await getAllTags();
  });

  const handleSelect = (option?: ComboBoxOption) => {
    if (!option || !option.id) {
      return;
    }

    selectedTagIds.add(option.value);
  };

  const handleRemove = (tagId: string) => {
    selectedTagIds.delete(tagId);
  };

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
      <div class="my-4 flex flex-col gap-2">
        <Combobox
          onSelect={handleSelect}
          label={$t('tags')}
          defaultFirstOption
          options={allTags.map((tag) => ({ id: tag.id, label: tag.value, value: tag.id }))}
          placeholder={$t('search_tags')}
        />
      </div>
    </form>

    <!-- Selected Tags Display -->
    {#if selectedTagIds.size > 0}
      <section class="flex flex-wrap pt-2 gap-1">
        {#each selectedTagIds as tagId (tagId)}
          {@const tag = tagMap[tagId]}
          {#if tag}
            <div class="flex group transition-all">
              <span
                class="inline-block h-min whitespace-nowrap ps-3 pe-1 group-hover:ps-3 py-1 text-center align-baseline leading-none text-gray-100 dark:text-immich-dark-gray bg-primary rounded-s-full hover:bg-immich-primary/80 dark:hover:bg-immich-dark-primary/80 transition-all"
              >
                <p class="text-sm">
                  {tag.value}
                </p>
              </span>

              <button
                type="button"
                class="text-gray-100 dark:text-immich-dark-gray bg-immich-primary/95 dark:bg-immich-dark-primary/95 rounded-e-full place-items-center place-content-center pe-2 ps-1 py-1 hover:bg-immich-primary/80 dark:hover:bg-immich-dark-primary/80 transition-all"
                title={$t('remove_tag')}
                onclick={() => handleRemove(tagId)}
              >
                <Icon path={mdiClose} />
              </button>
            </div>
          {/if}
        {/each}
      </section>
    {/if}

    {#if selectedTagIds.size === 0}
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
        {$t('select_tags_to_create_dynamic_album')}
      </p>
    {/if}
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
