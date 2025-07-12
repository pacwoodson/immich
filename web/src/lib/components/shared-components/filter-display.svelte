<script lang="ts">
  import { getAllTags, type TagResponseDto } from '@immich/sdk';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';

  interface Props {
    filters: any[];
  }

  let { filters }: Props = $props();

  let allTags: TagResponseDto[] = $state([]);
  let tagMap = $derived(Object.fromEntries(allTags.map((tag) => [tag.id, tag])));

  onMount(async () => {
    allTags = await getAllTags();
  });
</script>

{#if filters.length > 0}
  <div class="space-y-2">
    {#each filters as filter, index}
      <div class="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
        <div
          class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 text-xs font-medium"
        >
          {index + 1}
        </div>

        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {$t(`filter_type_${filter.type}`)}
          </div>
          
          <div class="text-xs text-gray-500 dark:text-gray-400">
            {#if filter.value && typeof filter.value === 'object'}
              <!-- Tag Filter -->
              {#if filter.type === 'tag' && filter.value.tagIds}
                <div class="flex items-center gap-2">
                  <span class="font-medium">{$t(filter.value.operator === 'and' ? 'operator_and' : 'operator_or')}:</span>
                  <span>{filter.value.tagIds.length} {$t('tags')}</span>
                </div>
                {#if filter.value.tagIds.length > 0}
                  <div class="text-xs text-gray-400 dark:text-gray-500">
                    {filter.value.tagIds.slice(0, 3).map((tagId: string) => tagMap[tagId]?.value || tagId).join(', ')}{filter.value.tagIds.length > 3 ? '...' : ''}
                  </div>
                {/if}
              {/if}

              <!-- Person Filter -->
              {#if filter.type === 'person' && filter.value.personIds}
                <div class="flex items-center gap-2">
                  <span class="font-medium">{$t(filter.value.operator === 'and' ? 'operator_and' : 'operator_or')}:</span>
                  <span>{filter.value.personIds.length} {$t('people')}</span>
                </div>
              {/if}

              <!-- Location Filter -->
              {#if filter.type === 'location'}
                <div class="space-y-1">
                  {#if filter.value.cities && filter.value.cities.length > 0}
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{$t('cities')}:</span>
                      <span>{filter.value.cities.length} {$t('cities')}</span>
                    </div>
                  {/if}
                  {#if filter.value.countries && filter.value.countries.length > 0}
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{$t('countries')}:</span>
                      <span>{filter.value.countries.length} {$t('countries')}</span>
                    </div>
                  {/if}
                  {#if filter.value.states && filter.value.states.length > 0}
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{$t('states')}:</span>
                      <span>{filter.value.states.length} {$t('states')}</span>
                    </div>
                  {/if}
                </div>
              {/if}

              <!-- Date Range Filter -->
              {#if filter.type === 'date_range'}
                <div class="space-y-1">
                  {#if filter.value.startDate && filter.value.endDate}
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{$t('date_range')}:</span>
                      <span>{new Date(filter.value.startDate).toLocaleDateString()} - {new Date(filter.value.endDate).toLocaleDateString()}</span>
                    </div>
                  {:else if filter.value.startDate}
                    <div class="flex items-center gap-2">
                      <span class="font-medium">From:</span>
                      <span>{new Date(filter.value.startDate).toLocaleDateString()}</span>
                    </div>
                  {:else if filter.value.endDate}
                    <div class="flex items-center gap-2">
                      <span class="font-medium">Until:</span>
                      <span>{new Date(filter.value.endDate).toLocaleDateString()}</span>
                    </div>
                  {/if}
                </div>
              {/if}

              <!-- Asset Type Filter -->
              {#if filter.type === 'asset_type'}
                <div class="space-y-1">
                  {#if filter.value.types && filter.value.types.length > 0}
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{$t('asset_types')}:</span>
                      <span>{filter.value.types.map((type: string) => $t(type === 'image' ? 'images' : 'videos')).join(', ')}</span>
                    </div>
                  {/if}
                  {#if filter.value.favorites !== null && filter.value.favorites !== undefined}
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{$t('favorites')}:</span>
                      <span>{filter.value.favorites ? $t('yes') : $t('no')}</span>
                    </div>
                  {/if}
                </div>
              {/if}
            {:else}
              <div class="text-xs text-gray-400 dark:text-gray-500">
                {JSON.stringify(filter.value)}
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  </div>
{:else}
  <p class="text-sm text-gray-500 dark:text-gray-400">
    {$t('no_filters_configured')}
  </p>
{/if} 