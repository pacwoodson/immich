<script lang="ts">
  import { goto } from '$app/navigation';
  import { scrollMemory } from '$lib/actions/scroll-memory';
  import UserPageLayout from '$lib/components/layouts/user-page-layout.svelte';
  import { AppRoute } from '$lib/constants';
  import { user } from '$lib/stores/user.store';
  import { getAssetThumbnailUrl } from '$lib/utils';
  import { t } from 'svelte-i18n';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const { dynamicAlbum, assets, assetCount } = data;

  const isOwner = $derived(dynamicAlbum.ownerId === $user.id);

  const handleBack = () => {
    goto(AppRoute.DYNAMIC_ALBUMS);
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log('Share dynamic album not implemented yet');
  };
</script>

<UserPageLayout title={data.meta.title} use={[[scrollMemory, { routeStartsWith: AppRoute.DYNAMIC_ALBUMS }]]}>
  {#snippet buttons()}
    <div class="flex place-items-center gap-2">
      <button
        class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        on:click={handleBack}
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
        {$t('back')}
      </button>

      {#if isOwner}
        <button
          class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          on:click={handleShare}
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"
            />
          </svg>
          {$t('share')}
        </button>
      {/if}
    </div>
  {/snippet}

  <div class="space-y-6">
    <!-- Dynamic Album Header -->
    <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            {dynamicAlbum.name}
          </h1>

          {#if dynamicAlbum.description}
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              {dynamicAlbum.description}
            </p>
          {/if}

          <div class="mt-4 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>{assetCount} {$t('items')}</span>

            {#if !isOwner}
              <span>{$t('by')} {dynamicAlbum.ownerId}</span>
            {/if}

            <span>{$t('created')} {new Date(dynamicAlbum.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          {#if dynamicAlbum.filters.length > 0}
            <div
              class="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            >
              <svg class="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
              </svg>
              {dynamicAlbum.filters.length}
              {$t('filters')}
            </div>
          {/if}
        </div>
      </div>
      <!-- Filters Section -->
      {#if dynamicAlbum.filters.length > 0}
        <div class="mt-4">
          <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {$t('filters')}
          </h2>

          <div class="space-y-3">
            {#each dynamicAlbum.filters as filter, index}
              <div class="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
                >
                  {index + 1}
                </div>

                <div class="flex-1">
                  <div class="text-sm font-medium text-gray-900 dark:text-white">
                    {$t('filter_type_tag')}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {#if filter.value && typeof filter.value === 'object' && filter.value.operator}
                      {$t(filter.value.operator === 'and' ? 'operator_and' : 'operator_or')}:
                    {/if}
                    {#if filter.value && typeof filter.value === 'object' && filter.value.tagIds}
                      {filter.value.tagIds.length} {$t('tags')}
                    {:else}
                      {JSON.stringify(filter.value)}
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Assets Section -->
    <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        {$t('assets')} ({assetCount})
      </h2>

      {#if assets.length === 0}
        <div class="text-center py-8">
          <div class="mx-auto mb-4 h-16 w-16 text-gray-400 dark:text-gray-500">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"
              />
            </svg>
          </div>
          <p class="text-gray-500 dark:text-gray-400">
            {$t('no_assets_found')}
          </p>
        </div>
      {:else}
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {#each assets as asset (asset.id)}
            <div class="aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
              <img
                src={getAssetThumbnailUrl(asset.id)}
                alt={asset.originalFileName || 'Asset'}
                class="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          {/each}
        </div>

        {#if assetCount > assets.length}
          <div class="mt-4 text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {$t('showing_first_n_items', { values: { count: assets.length, total: assetCount } })}
            </p>
          </div>
        {/if}
      {/if}
    </div>
  </div>
</UserPageLayout>
