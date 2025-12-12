<script lang="ts">
  import AssetTypeSelector from '$lib/components/shared-components/asset-type-selector.svelte';
  import DateRangePicker from '$lib/components/shared-components/date-range-picker.svelte';
  import FilterOperatorSelector from '$lib/components/shared-components/filter-operator-selector.svelte';
  import LocationFilter from '$lib/components/shared-components/location-filter.svelte';
  import MetadataFilter from '$lib/components/shared-components/metadata-filter.svelte';
  import PeopleSelector from '$lib/components/shared-components/people-selector.svelte';
  import TagSelector from '$lib/components/shared-components/tag-selector.svelte';
  import { handleError } from '$lib/utils/handle-error';
  import { createAlbum, updateAlbumInfo, type AlbumResponseDto } from '@immich/sdk';
  import { Button, HStack, Icon, Input, Modal, ModalBody, ModalFooter } from '@immich/ui';
  import { mdiFilterOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import { SvelteSet } from 'svelte/reactivity';

  interface DynamicAlbumFilters {
    tags?: string[];
    people?: string[];
    location?: string | { city?: string; state?: string; country?: string };
    dateRange?: { start: Date | string; end: Date | string };
    assetType?: 'IMAGE' | 'VIDEO';
    metadata?: {
      isFavorite?: boolean;
      make?: string;
      model?: string;
      lensModel?: string;
      rating?: number;
    };
    operator?: 'and' | 'or';
  }

  interface Props {
    onClose: (album?: AlbumResponseDto) => void;
    initialFilters?: DynamicAlbumFilters;
    albumName?: string;
    description?: string;
    albumId?: string; // If provided, we're in edit mode
  }

  let { onClose, initialFilters, albumName: initialAlbumName, description: initialDescription, albumId }: Props = $props();

  const isEditMode = $derived(!!albumId);

  let albumName = $state(initialAlbumName || '');
  let description = $state(initialDescription || '');
  let isSubmitting = $state(false);

  // Filter states
  let selectedTagIds = $state(new SvelteSet<string>(initialFilters?.tags || []));
  let selectedPeopleIds = $state(new SvelteSet<string>(initialFilters?.people || []));
  let location = $state<string | { city?: string; state?: string; country?: string } | undefined>(
    initialFilters?.location,
  );
  let startDate = $state<Date | undefined>(
    initialFilters?.dateRange?.start ? new Date(initialFilters.dateRange.start) : undefined,
  );
  let endDate = $state<Date | undefined>(
    initialFilters?.dateRange?.end ? new Date(initialFilters.dateRange.end) : undefined,
  );
  let assetType = $state<'IMAGE' | 'VIDEO' | undefined>(initialFilters?.assetType);
  let metadata = $state(initialFilters?.metadata || {});
  let operator = $state<'and' | 'or'>(initialFilters?.operator || 'or');

  // In edit mode, start with filters tab; in create mode, start with basic tab
  let activeTab = $state<'basic' | 'filters' | 'metadata'>(!!albumId ? 'filters' : 'basic');

  const hasFilters = $derived(
    selectedTagIds.size > 0 ||
      selectedPeopleIds.size > 0 ||
      location !== undefined ||
      (startDate !== undefined && endDate !== undefined) ||
      assetType !== undefined ||
      Object.keys(metadata).length > 0,
  );

  const handleSubmit = async (event: Event) => {
    event.preventDefault();

    if (!albumName) {
      handleError(new Error('Album name is required'), $t('errors.album_name_required'));
      return;
    }

    if (!hasFilters) {
      handleError(
        new Error('At least one filter is required'),
        $t('errors.dynamic_album_requires_filters'),
      );
      return;
    }

    isSubmitting = true;

    try {
      const filters: DynamicAlbumFilters = {
        operator,
      };

      if (selectedTagIds.size > 0) {
        filters.tags = [...selectedTagIds];
      }

      if (selectedPeopleIds.size > 0) {
        filters.people = [...selectedPeopleIds];
      }

      if (location) {
        filters.location = location;
      }

      if (startDate && endDate) {
        filters.dateRange = {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        };
      }

      if (assetType) {
        filters.assetType = assetType;
      }

      if (Object.keys(metadata).length > 0) {
        filters.metadata = metadata;
      }

      let album: AlbumResponseDto;

      if (isEditMode && albumId) {
        // Update existing album
        await updateAlbumInfo({
          id: albumId,
          updateAlbumDto: {
            albumName,
            description,
            filters,
          },
        });
        // Return a partial album object with updated fields
        album = {
          id: albumId,
          albumName,
          description,
          filters,
        } as AlbumResponseDto;
      } else {
        // Create new album
        album = await createAlbum({
          createAlbumDto: {
            albumName,
            description,
            dynamic: true,
            filters,
          },
        });
      }

      onClose(album);
    } catch (error) {
      handleError(error, isEditMode ? $t('errors.unable_to_update_album_filters') : $t('errors.unable_to_create_album'));
    } finally {
      isSubmitting = false;
    }
  };
</script>

<Modal icon={mdiFilterOutline} title={isEditMode ? $t('edit_filters') : $t('create_dynamic_album')} size="large" {onClose}>
  <ModalBody>
    <form onsubmit={handleSubmit} autocomplete="off" id="create-dynamic-album-form">
      <!-- Tabs -->
      <div class="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        {#if !isEditMode}
          <button
            type="button"
            class="px-4 py-2 font-medium transition-colors {activeTab === 'basic'
              ? 'text-immich-primary border-b-2 border-immich-primary'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}"
            onclick={() => (activeTab = 'basic')}
          >
            {$t('basic_info')}
          </button>
        {/if}
        <button
          type="button"
          class="px-4 py-2 font-medium transition-colors {activeTab === 'filters'
            ? 'text-immich-primary border-b-2 border-immich-primary'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}"
          onclick={() => (activeTab = 'filters')}
        >
          {$t('filters')}
          {#if selectedTagIds.size > 0 || selectedPeopleIds.size > 0 || location || (startDate && endDate) || assetType}
            <span class="ml-1 text-xs">
              ({[
                selectedTagIds.size > 0 && 'tags',
                selectedPeopleIds.size > 0 && 'people',
                location && 'location',
                startDate && endDate && 'date',
                assetType && 'type',
              ]
                .filter(Boolean)
                .length})
            </span>
          {/if}
        </button>
        <button
          type="button"
          class="px-4 py-2 font-medium transition-colors {activeTab === 'metadata'
            ? 'text-immich-primary border-b-2 border-immich-primary'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}"
          onclick={() => (activeTab = 'metadata')}
        >
          {$t('metadata')}
          {#if Object.keys(metadata).length > 0}
            <span class="ml-1 text-xs">({Object.keys(metadata).length})</span>
          {/if}
        </button>
      </div>

      <div class="space-y-4 max-h-[60vh] overflow-y-auto immich-scrollbar px-1">
        {#if activeTab === 'basic'}
          <div class="space-y-4">
            <div>
              <label for="albumName" class="immich-form-label">{$t('album_name')}</label>
              <Input id="albumName" bind:value={albumName} required />
            </div>

            <div>
              <label for="description" class="immich-form-label">{$t('description')} ({$t('optional')})</label>
              <textarea
                id="description"
                bind:value={description}
                class="immich-form-input"
                rows="3"
                placeholder={$t('describe_dynamic_album')}
              ></textarea>
            </div>

            <FilterOperatorSelector bind:operator />

            {#if !hasFilters}
              <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p class="text-sm text-yellow-800 dark:text-yellow-200">
                  {$t('dynamic_album_requires_filters_warning')}
                </p>
              </div>
            {/if}
          </div>
        {:else if activeTab === 'filters'}
          <div class="space-y-6">
            <TagSelector bind:selectedTagIds />

            <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
              <PeopleSelector bind:selectedPeopleIds />
            </div>

            <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
              <LocationFilter bind:location />
            </div>

            <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
              <DateRangePicker bind:startDate bind:endDate />
            </div>

            <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
              <AssetTypeSelector bind:assetType />
            </div>
          </div>
        {:else if activeTab === 'metadata'}
          <div class="space-y-4">
            <MetadataFilter bind:metadata />
          </div>
        {/if}
      </div>
    </form>
  </ModalBody>

  <ModalFooter>
    <HStack fullWidth>
      <Button shape="round" color="secondary" fullWidth onclick={() => onClose()}>{$t('cancel')}</Button>
      <Button
        shape="round"
        type="submit"
        fullWidth
        disabled={isSubmitting || !albumName || !hasFilters}
        form="create-dynamic-album-form"
      >
        {isEditMode ? $t('save') : $t('create_album')}
      </Button>
    </HStack>
  </ModalFooter>
</Modal>
