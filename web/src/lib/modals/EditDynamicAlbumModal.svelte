<script lang="ts">
  import Icon from '$lib/components/elements/icon.svelte';
  import TagSelector from '$lib/components/shared-components/tag-selector.svelte';
  import {
    notificationController,
    NotificationType,
  } from '$lib/components/shared-components/notification/notification';
  import { handleError } from '$lib/utils/handle-error';
  import { getAllTags, updateDynamicAlbumInfo, type DynamicAlbumResponseDto, type TagResponseDto } from '@immich/sdk';
  import { Button, HStack, Modal, ModalBody, ModalFooter } from '@immich/ui';
  import { mdiClose, mdiRenameOutline, mdiArrowUpThin, mdiArrowDownThin } from '@mdi/js';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';
  import { SvelteSet } from 'svelte/reactivity';
  import type { RenderedOption } from '../components/elements/dropdown.svelte';
  import SettingDropdown from '../components/shared-components/settings/setting-dropdown.svelte';

  interface Props {
    album: DynamicAlbumResponseDto;
    onClose: (album?: DynamicAlbumResponseDto) => void;
  }

  let { album = $bindable(), onClose }: Props = $props();

  let albumName = $state(album.name);
  let allTags: TagResponseDto[] = $state([]);
  let tagMap = $derived(Object.fromEntries(allTags.map((tag) => [tag.id, tag])));
  let selectedTagIds = new SvelteSet<string>();
  let selectedOperator = $state<'and' | 'or'>('and');
  let isSubmitting = $state(false);
  let disabled = $derived(isSubmitting || !albumName.trim() || selectedTagIds.size === 0);

  // Operator options for the dropdown
  const operatorOptions: Record<'and' | 'or', RenderedOption> = {
    and: { icon: mdiArrowUpThin, title: $t('operator_and') },
    or: { icon: mdiArrowDownThin, title: $t('operator_or') },
  };

  onMount(async () => {
    allTags = await getAllTags();

    // Pre-populate selected tags and operator from existing filters
    for (const filter of album.filters) {
      if (filter.type === 'tag' && filter.value && typeof filter.value === 'object' && 'tagIds' in filter.value) {
        const tagIds = filter.value.tagIds as string[];
        for (const tagId of tagIds) {
          selectedTagIds.add(tagId);
        }
        // Set the operator from existing filter
        if (filter.value.operator) {
          selectedOperator = filter.value.operator as 'and' | 'or';
        }
      }
    }
  });

  const handleSelect = (option?: { id: string; value: string }) => {
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
      const updatedAlbum = await updateDynamicAlbumInfo({
        id: album.id,
        updateDynamicAlbumDto: {
          name: albumName.trim(),
          filters: [
            {
              type: 'tag' as const,
              value: {
                tagIds: [...selectedTagIds],
                operator: selectedOperator,
              },
            },
          ],
        },
      });

      notificationController.show({
        message: $t('dynamic_album_updated', { values: { album: updatedAlbum.name } }),
        type: NotificationType.Info,
      });

      // Update the bound album object
      album.name = updatedAlbum.name;
      album.filters = updatedAlbum.filters;
      album.updatedAt = updatedAlbum.updatedAt;

      onClose(updatedAlbum);
    } catch (error) {
      handleError(error, $t('errors.failed_to_update_dynamic_album'));
    } finally {
      isSubmitting = false;
    }
  };

  const onsubmit = async (event: Event) => {
    event.preventDefault();
    await handleSubmit();
  };
</script>

<Modal size="medium" title={$t('edit_dynamic_album')} icon={mdiRenameOutline} {onClose}>
  <ModalBody>
    <div class="text-immich-primary dark:text-immich-dark-primary">
      <p class="text-sm dark:text-immich-dark-fg mb-4">
        {$t('edit_dynamic_album_description')}
      </p>
    </div>

    <form {onsubmit} autocomplete="off" id="edit-dynamic-album-form">
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

      <!-- Operator Selection -->
      {#if selectedTagIds.size > 1}
        <div class="my-4 flex flex-col gap-2">
          <SettingDropdown
            title={$t('filter_operator')}
            subtitle={$t('filter_operator_description')}
            options={Object.values(operatorOptions)}
            selectedOption={operatorOptions[selectedOperator]}
            onToggle={(option) => {
              const newOperator = Object.keys(operatorOptions).find(key => operatorOptions[key as 'and' | 'or'] === option) as 'and' | 'or';
              if (newOperator) {
                selectedOperator = newOperator;
              }
            }}
          />
        </div>
      {/if}
      
      <!-- Tag Selection -->
      <TagSelector bind:selectedTagIds />

    </form>

    {#if selectedTagIds.size === 0}
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
        {$t('select_tags_for_dynamic_album')}
      </p>
    {/if}
  </ModalBody>

  <ModalFooter>
    <HStack fullWidth>
      <Button shape="round" color="secondary" fullWidth onclick={() => onClose()}>{$t('cancel')}</Button>
      <Button type="submit" shape="round" fullWidth form="edit-dynamic-album-form" {disabled}>
        {$t('save')}
      </Button>
    </HStack>
  </ModalFooter>
</Modal>
