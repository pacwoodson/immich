<script lang="ts">
  import { getAllTags, type TagResponseDto } from '@immich/sdk';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';

  interface Props {
    filters: any;
  }

  let { filters }: Props = $props();

  let allTags: TagResponseDto[] = $state([]);
  let tagMap = $derived(Object.fromEntries(allTags.map((tag) => [tag.id, tag])));

  onMount(async () => {
    allTags = await getAllTags();
  });
</script>

{#if filters && typeof filters === 'object'}
  <div class="space-y-2">
    <!-- Tag Filter -->
    {#if filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0}
      <div class="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
        <div
          class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 text-xs font-medium"
        >
          1
        </div>

        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {$t('filter_type_tag')}
          </div>

          <div class="text-xs text-gray-500 dark:text-gray-400">
            <div class="flex items-center gap-2">
              <span class="font-medium">{$t(filters.operator === 'and' ? 'operator_and' : 'operator_or')}:</span>
              <span>{filters.tags.length} {$t('tags')}</span>
            </div>
            {#if filters.tags.length > 0}
              <div class="text-xs text-gray-400 dark:text-gray-500">
                {filters.tags
                  .slice(0, 3)
                  .map((tagId: string) => tagMap[tagId]?.value || tagId)
                  .join(', ')}{filters.tags.length > 3 ? '...' : ''}
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- Person Filter -->
    {#if filters.people && Array.isArray(filters.people) && filters.people.length > 0}
      <div class="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
        <div
          class="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400 text-xs font-medium"
        >
          2
        </div>

        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {$t('filter_type_person')}
          </div>

          <div class="text-xs text-gray-500 dark:text-gray-400">
            <div class="flex items-center gap-2">
              <span class="font-medium">{$t(filters.operator === 'and' ? 'operator_and' : 'operator_or')}:</span>
              <span>{filters.people.length} {$t('people')}</span>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Location Filter -->
    {#if filters.location}
      <div class="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
        <div
          class="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400 text-xs font-medium"
        >
          3
        </div>

        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {$t('filter_type_location')}
          </div>

          <div class="text-xs text-gray-500 dark:text-gray-400">
            {#if typeof filters.location === 'string'}
              <div class="flex items-center gap-2">
                <span class="font-medium">{$t('location')}:</span>
                <span>{filters.location}</span>
              </div>
            {:else if typeof filters.location === 'object'}
              <div class="space-y-1">
                {#if filters.location.city}
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{$t('city')}:</span>
                    <span>{filters.location.city}</span>
                  </div>
                {/if}
                {#if filters.location.state}
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{$t('state')}:</span>
                    <span>{filters.location.state}</span>
                  </div>
                {/if}
                {#if filters.location.country}
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{$t('country')}:</span>
                    <span>{filters.location.country}</span>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- Date Range Filter -->
    {#if filters.dateRange}
      <div class="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
        <div
          class="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400 text-xs font-medium"
        >
          4
        </div>

        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {$t('filter_type_date_range')}
          </div>

          <div class="text-xs text-gray-500 dark:text-gray-400">
            <div class="space-y-1">
              {#if filters.dateRange.start && filters.dateRange.end}
                <div class="flex items-center gap-2">
                  <span class="font-medium">{$t('date_range')}:</span>
                  <span
                    >{new Date(filters.dateRange.start).toLocaleDateString()} - {new Date(
                      filters.dateRange.end,
                    ).toLocaleDateString()}</span
                  >
                </div>
              {:else if filters.dateRange.start}
                <div class="flex items-center gap-2">
                  <span class="font-medium">From:</span>
                  <span>{new Date(filters.dateRange.start).toLocaleDateString()}</span>
                </div>
              {:else if filters.dateRange.end}
                <div class="flex items-center gap-2">
                  <span class="font-medium">Until:</span>
                  <span>{new Date(filters.dateRange.end).toLocaleDateString()}</span>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Asset Type Filter -->
    {#if filters.assetType}
      <div class="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
        <div
          class="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400 text-xs font-medium"
        >
          5
        </div>

        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {$t('filter_type_asset_type')}
          </div>

          <div class="text-xs text-gray-500 dark:text-gray-400">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-medium">{$t('asset_type')}:</span>
                <span>{$t(filters.assetType === 'IMAGE' ? 'images' : 'videos')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Metadata Filter -->
    {#if filters.metadata}
      <div class="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
        <div
          class="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400 text-xs font-medium"
        >
          6
        </div>

        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {$t('filter_type_metadata')}
          </div>

          <div class="text-xs text-gray-500 dark:text-gray-400">
            <div class="space-y-1">
              {#if filters.metadata.isFavorite !== undefined}
                <div class="flex items-center gap-2">
                  <span class="font-medium">{$t('favorites')}:</span>
                  <span>{filters.metadata.isFavorite ? $t('yes') : $t('no')}</span>
                </div>
              {/if}
              {#if filters.metadata.make}
                <div class="flex items-center gap-2">
                  <span class="font-medium">{$t('make')}:</span>
                  <span>{filters.metadata.make}</span>
                </div>
              {/if}
              {#if filters.metadata.model}
                <div class="flex items-center gap-2">
                  <span class="font-medium">{$t('model')}:</span>
                  <span>{filters.metadata.model}</span>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
{:else}
  <p class="text-sm text-gray-500 dark:text-gray-400">
    {$t('no_filters_configured')}
  </p>
{/if}
