<script lang="ts">
  import { user } from '$lib/stores/user.store';
  import type { ContextMenuPosition } from '$lib/utils/context-menu';
  import { type DynamicAlbumResponseDto } from '$lib/utils/dynamic-album-api';
  import { t } from 'svelte-i18n';

  interface Props {
    dynamicAlbum: DynamicAlbumResponseDto;
    allowEdit?: boolean;
    onContextMenu: (detail: ContextMenuPosition) => void;
    onClick: () => void;
  }

  let { dynamicAlbum, allowEdit = false, onContextMenu, onClick }: Props = $props();

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    onContextMenu({ x: event.clientX, y: event.clientY });
  };

  const isOwner = $derived(dynamicAlbum.ownerId === $user.id);
  const hasSharedUsers = $derived(dynamicAlbum.sharedUsers.length > 0);
  const hasFilters = $derived(dynamicAlbum.filters.length > 0);
</script>

<div
  class="group relative cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-all duration-200 hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
  onclick={onClick}
  oncontextmenu={handleContextMenu}
>
  <!-- Dynamic Album Cover -->
  <div class="mb-3 aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
    <div class="flex h-full w-full items-center justify-center">
      <div class="text-center">
        <div class="mx-auto mb-2 h-12 w-12 text-gray-400 dark:text-gray-500">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
            />
          </svg>
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Dynamic Album</div>
      </div>
    </div>
  </div>

  <!-- Dynamic Album Info -->
  <div class="space-y-2">
    <!-- Title -->
    <h3 class="line-clamp-2 text-sm font-medium text-gray-900 dark:text-white">
      {dynamicAlbum.name}
    </h3>

    <!-- Description -->
    {#if dynamicAlbum.description}
      <p class="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
        {dynamicAlbum.description}
      </p>
    {/if}

    <!-- Meta Information -->
    <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
      <span>{dynamicAlbum.assetCount} {$t('items')}</span>

      <div class="flex items-center gap-1">
        {#if hasFilters}
          <div class="flex items-center gap-1" title={$t('has_filters')}>
            <svg class="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
            </svg>
          </div>
        {/if}

        {#if hasSharedUsers}
          <div class="flex items-center gap-1" title={$t('shared')}>
            <svg class="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M16 5c1.61 0 3.09.59 4.23 1.57L21 5.5V11h-5.5l2.4-2.4C17.79 7.21 16.96 7 16 7c-2.76 0-5 2.24-5 5s2.24 5 5 5c.96 0 1.79-.21 2.6-.6L20.5 16H22v-5.5l-2.4 2.4C21.41 13.09 22 11.61 22 10c0-3.31-2.69-6-6-6zm-8 9c-2.76 0-5-2.24-5-5s2.24-5 5-5c.96 0 1.79.21 2.6.6L7.5 4H6v5.5l2.4-2.4C6.59 6.91 6 8.39 6 10c0 3.31 2.69 6 6 6z"
              />
            </svg>
          </div>
        {/if}

        {#if !isOwner}
          <div class="flex items-center gap-1" title={dynamicAlbum.owner.name}>
            <svg class="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
              />
            </svg>
          </div>
        {/if}
      </div>
    </div>

    <!-- Owner Info -->
    {#if !isOwner}
      <div class="text-xs text-gray-500 dark:text-gray-400">
        {$t('by')}
        {dynamicAlbum.owner.name}
      </div>
    {/if}
  </div>

  <!-- Hover Overlay -->
  <div
    class="absolute inset-0 rounded-lg bg-black bg-opacity-0 transition-all duration-200 group-hover:bg-opacity-10"
  ></div>
</div>
