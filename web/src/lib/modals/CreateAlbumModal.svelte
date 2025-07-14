<script lang="ts">
  import type { RenderedOption } from '$lib/components/elements/dropdown.svelte';
  import {
    notificationController,
    NotificationType,
  } from '$lib/components/shared-components/notification/notification';
  import SettingDropdown from '$lib/components/shared-components/settings/setting-dropdown.svelte';
  import TagSelector from '$lib/components/shared-components/tag-selector.svelte';
  import { handleError } from '$lib/utils/handle-error';
  import { createAlbum, type AlbumResponseDto } from '@immich/sdk';
  import { Button, HStack, Modal, ModalBody, ModalFooter } from '@immich/ui';
  import { mdiFilter, mdiFolderOutline, mdiMultiplication, mdiPlus } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import { SvelteSet } from 'svelte/reactivity';

  interface Props {
    onClose: (album?: AlbumResponseDto) => void;
    shared?: boolean;
    assetIds?: string[];
  }

  let { onClose, shared = false, assetIds = [] }: Props = $props();

  let albumName = $state('');
  let albumDescription = $state('');
  let isDynamic = $state(false);
  let selectedTagIds = new SvelteSet<string>();
  let selectedOperator: 'and' | 'or' = $state('and');
  let isSubmitting = $state(false);

  // Operator options for the dropdown
  const operatorOptions: Record<'and' | 'or', RenderedOption> = {
    and: { icon: mdiMultiplication, title: $t('operator_and') },
    or: { icon: mdiPlus, title: $t('operator_or') },
  };

  // Form validation
  let isValidRegularAlbum = $derived(!isSubmitting && albumName.trim().length > 0);
  let isValidDynamicAlbum = $derived(!isSubmitting && albumName.trim().length > 0 && selectedTagIds.size > 0);
  let disabled = $derived(isDynamic ? !isValidDynamicAlbum : !isValidRegularAlbum);

  const handleSubmit = async () => {
    if (!albumName.trim()) {
      return;
    }

    if (isDynamic && selectedTagIds.size === 0) {
      return;
    }

    isSubmitting = true;
    try {
      let createAlbumDto: any = {
        albumName: albumName.trim(),
        description: albumDescription.trim() || undefined,
        dynamic: isDynamic,
      };

      // Add asset IDs for regular albums
      if (!isDynamic && assetIds.length > 0) {
        createAlbumDto.assetIds = assetIds;
      }

      // Add filters for dynamic albums
      if (isDynamic) {
        createAlbumDto.filters = {
          tags: [...selectedTagIds],
          operator: selectedOperator,
        };
      }

      const album = await createAlbum({ createAlbumDto });

      notificationController.show({
        message: isDynamic
          ? $t('dynamic_album_created', { values: { album: album.albumName } })
          : $t('album_created_success', { values: { album: album.albumName } }),
        type: NotificationType.Info,
      });

      onClose(album);
    } catch (error) {
      handleError(error, isDynamic ? $t('errors.failed_to_create_dynamic_album') : $t('errors.failed_to_create_album'));
    } finally {
      isSubmitting = false;
    }
  };

  const onsubmit = async (event: Event) => {
    event.preventDefault();
    await handleSubmit();
  };
</script>

<Modal
  size="medium"
  title={isDynamic ? $t('create_dynamic_album') : $t('create_album')}
  icon={mdiFolderOutline}
  {onClose}
>
  <ModalBody>
    <div class="text-immich-primary dark:text-immich-dark-primary">
      <p class="text-sm dark:text-immich-dark-fg mb-4">
        {isDynamic ? $t('create_dynamic_album_description') : $t('create_album_description')}
      </p>
    </div>

    <form {onsubmit} autocomplete="off" id="create-album-form">
      <!-- Album Type Toggle -->
      <div class="my-4 flex flex-col gap-2">
        <label class="immich-form-label">{$t('album_type')}</label>
        <div class="flex gap-2">
          <Button
            size="small"
            variant={!isDynamic ? 'filled' : 'ghost'}
            color={!isDynamic ? 'primary' : 'secondary'}
            leadingIcon={mdiFolderOutline}
            onclick={() => (isDynamic = false)}
          >
            {$t('regular_album')}
          </Button>
          <Button
            size="small"
            variant={isDynamic ? 'filled' : 'ghost'}
            color={isDynamic ? 'primary' : 'secondary'}
            leadingIcon={mdiFilter}
            onclick={() => (isDynamic = true)}
          >
            {$t('dynamic_album')}
          </Button>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          {isDynamic ? $t('dynamic_album_type_description') : $t('regular_album_type_description')}
        </p>
      </div>

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

      <!-- Album Description -->
      <div class="my-4 flex flex-col gap-2">
        <label class="immich-form-label" for="album-description">{$t('description')}</label>
        <textarea
          class="immich-form-input"
          id="album-description"
          bind:value={albumDescription}
          placeholder={$t('enter_album_description')}
          rows="3"
        />
      </div>

      <!-- Dynamic Album Filters -->
      {#if isDynamic}
        <div class="my-4 flex flex-col gap-2">
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
      {/if}

      <!-- Asset Count Info for Regular Albums -->
      {#if !isDynamic && assetIds.length > 0}
        <div class="my-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {$t('assets_will_be_added', { values: { count: assetIds.length } })}
          </p>
        </div>
      {/if}
    </form>
  </ModalBody>

  <ModalFooter>
    <HStack fullWidth>
      <Button shape="round" color="secondary" fullWidth onclick={() => onClose()}>
        {$t('cancel')}
      </Button>
      <Button type="submit" shape="round" fullWidth form="create-album-form" {disabled}>
        {$t('create')}
      </Button>
    </HStack>
  </ModalFooter>
</Modal>
