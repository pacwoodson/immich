<script lang="ts">
  import AlbumCover from '$lib/components/album-page/album-cover.svelte';
  import { user } from '$lib/stores/user.store';
  import { getContextMenuPositionFromEvent, type ContextMenuPosition } from '$lib/utils/context-menu';
  import { getShortDateRange } from '$lib/utils/date-time';
  import type { AlbumResponseDto } from '@immich/sdk';
  import { IconButton } from '@immich/ui';
  import { mdiDotsVertical, mdiFilterOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';

  interface Props {
    album: AlbumResponseDto;
    showOwner?: boolean;
    showDateRange?: boolean;
    showItemCount?: boolean;
    preload?: boolean;
    onShowContextMenu?: ((position: ContextMenuPosition) => unknown) | undefined;
  }

  let {
    album,
    showOwner = false,
    showDateRange = false,
    showItemCount = false,
    preload = false,
    onShowContextMenu = undefined,
  }: Props = $props();

  const showAlbumContextMenu = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onShowContextMenu?.(getContextMenuPositionFromEvent(e));
  };

  // Computed properties for dynamic albums
  let isDynamic = $derived(album?.dynamic === true);
  let hasFilters = $derived(isDynamic && album?.filters && Object.keys(album.filters).length > 0);
  let filterCount = $derived(hasFilters ? Object.keys(album.filters).length : 0);
</script>

<div
  class="group relative rounded-2xl border border-transparent p-5 hover:bg-gray-100 hover:border-gray-200 dark:hover:border-gray-800 dark:hover:bg-gray-900"
  data-testid="album-card"
  class:dynamic-album={isDynamic}
>
  {#if onShowContextMenu}
    <div
      id="icon-{album.id}"
      class="absolute end-6 top-6 opacity-0 group-hover:opacity-100 focus-within:opacity-100"
      data-testid="context-button-parent"
    >
      <IconButton
        color="secondary"
        aria-label={$t('show_album_options')}
        icon={mdiDotsVertical}
        shape="round"
        variant="ghost"
        size="medium"
        class="icon-white-drop-shadow"
        onclick={showAlbumContextMenu}
      />
    </div>
  {/if}

  <!-- Dynamic album indicator -->
  {#if isDynamic}
    <div class="absolute start-3 top-3 z-10" data-testid="dynamic-indicator">
      <div class="flex items-center gap-1 rounded-full bg-immich-primary/90 px-2 py-1 text-xs text-white backdrop-blur-sm">
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        <span>{$t('dynamic')}</span>
      </div>
    </div>
  {/if}

  <AlbumCover {album} {preload} class="transition-all duration-300 hover:shadow-lg" />

  <div class="mt-4">
    <p
      class="w-full leading-6 text-lg line-clamp-2 font-semibold text-black dark:text-white group-hover:text-immich-primary dark:group-hover:text-immich-dark-primary"
      data-testid="album-name"
      title={album.albumName}
    >
      {album.albumName}
    </p>

    {#if showDateRange && album.startDate && album.endDate}
      <p class="flex text-sm dark:text-immich-dark-fg capitalize">
        {getShortDateRange(album.startDate, album.endDate)}
      </p>
    {/if}

    <span class="flex gap-2 text-sm dark:text-immich-dark-fg" data-testid="album-details">
      {#if showItemCount}
        <p>
          {$t('items_count', { values: { count: album.assetCount } })}
        </p>
      {/if}

      {#if (showOwner || album.shared) && showItemCount}
        <p>•</p>
      {/if}

      {#if showOwner}
        {#if $user.id === album.ownerId}
          <p>{$t('owned')}</p>
        {:else if album.owner}
          <p>{$t('shared_by_user', { values: { user: album.owner.name } })}</p>
        {:else}
          <p>{$t('shared')}</p>
        {/if}
      {:else if album.shared}
        <p>{$t('shared')}</p>
      {/if}
    </span>

    <!-- Description for dynamic albums -->
    {#if isDynamic && album.description}
      <p class="line-clamp-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
        {album.description}
      </p>
    {/if}

    <!-- Filter indicators for dynamic albums -->
    {#if hasFilters}
      <div class="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400" data-testid="filter-indicator">
        <IconButton
          icon={mdiFilterOutline}
          size="small"
          color="secondary"
          variant="ghost"
          class="!p-0 !w-4 !h-4"
          aria-label={$t('filters')}
        />
        <span>{$t('filters_count', { values: { count: filterCount } })}</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .dynamic-album {
    position: relative;
  }
  
  .dynamic-album::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 1rem;
    background: linear-gradient(45deg, transparent, rgba(99, 102, 241, 0.1), transparent);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .dynamic-album:hover::before {
    opacity: 1;
  }
</style>
