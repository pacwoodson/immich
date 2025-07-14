<script lang="ts">
  import SettingDropdown from '$lib/components/shared-components/settings/setting-dropdown.svelte';
  import TagSelector from '$lib/components/shared-components/tag-selector.svelte';
  import { handleError } from '$lib/utils/handle-error';
  import { updateAlbumInfo, type AlbumResponseDto } from '@immich/sdk';
  import { Button, HStack, Modal, ModalBody, ModalFooter } from '@immich/ui';
  import { mdiArrowDownThin, mdiArrowUpThin } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import { SvelteSet } from 'svelte/reactivity';
  import type { RenderedOption } from '../components/elements/dropdown.svelte';
  import { notificationController, NotificationType } from '../components/shared-components/notification/notification';

  interface Props {
    album: AlbumResponseDto;
    onClose: (result?: { action: 'updated'; album: AlbumResponseDto }) => void;
  }

  let { album, onClose }: Props = $props();

  let selectedTagIds = $state(new SvelteSet<string>());
  let selectedOperator: 'and' | 'or' = $state('and');
  let isSubmitting = $state(false);

  // Operator options for the dropdown
  const operatorOptions: Record<'and' | 'or', RenderedOption> = {
    and: { icon: mdiArrowUpThin, title: $t('operator_and') },
    or: { icon: mdiArrowDownThin, title: $t('operator_or') },
  };

  // Pre-populate selected tags and operator from existing filters
  $effect(() => {
    if (album.filters && typeof album.filters === 'object') {
      // Handle flat filter structure: {tags: [...], operator: "and", ...}
      const filters = album.filters as any;
      if (filters.tags && Array.isArray(filters.tags)) {
        // Clear existing tags and add new ones
        selectedTagIds.clear();
        for (const tagId of filters.tags) {
          selectedTagIds.add(tagId);
        }
      }
      // Set the operator from existing filter
      if (filters.operator) {
        selectedOperator = filters.operator as 'and' | 'or';
      }
    }
  });

  const handleSubmit = async () => {
    if (selectedTagIds.size === 0) {
      return;
    }

    isSubmitting = true;
    try {
      const updatedAlbum = await updateAlbumInfo({
        id: album.id,
        updateAlbumDto: {
          filters: {
            tags: [...selectedTagIds],
            operator: selectedOperator,
          },
        },
      });

      notificationController.show({
        message: $t('album_updated', { values: { album: updatedAlbum.albumName } }),
        type: NotificationType.Info,
      });

      onClose({ action: 'updated', album: updatedAlbum });
    } catch (error) {
      handleError(error, $t('errors.unable_to_save_album'));
    } finally {
      isSubmitting = false;
    }
  };

  const onsubmit = async (event: Event) => {
    event.preventDefault();
    await handleSubmit();
  };

  let disabled = $derived(selectedTagIds.size === 0 || isSubmitting);
</script>

<Modal title={$t('filters')} onClose={() => onClose()} size="medium">
  <form id="edit-dynamic-album-filters-form" {onsubmit}>
    <ModalBody>
      <!-- Dynamic Album Filters -->
      <div class="my-4 flex flex-col gap-2">
        <label class="immich-form-label" for="tag-selector">{$t('filters')}</label>
        <TagSelector bind:selectedTagIds />
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
              const newOperator = Object.keys(operatorOptions).find(
                (key) => operatorOptions[key as 'and' | 'or'] === option,
              ) as 'and' | 'or';
              if (newOperator) {
                selectedOperator = newOperator;
              }
            }}
          />
        </div>
      {/if}
    </ModalBody>

    <ModalFooter>
      <HStack fullWidth>
        <Button shape="round" color="secondary" fullWidth onclick={() => onClose()}>
          {$t('cancel')}
        </Button>
        <Button type="submit" shape="round" fullWidth form="edit-dynamic-album-filters-form" {disabled}>
          {$t('save')}
        </Button>
      </HStack>
    </ModalFooter>
  </form>
</Modal>
