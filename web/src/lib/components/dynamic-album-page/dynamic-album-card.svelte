<script lang="ts">
  import { user } from '$lib/stores/user.store';
  import { getContextMenuPositionFromEvent, type ContextMenuPosition } from '$lib/utils/context-menu';
  import { type DynamicAlbumResponseDto } from '@immich/sdk';
  import { IconButton } from '@immich/ui';
  import { mdiDotsVertical } from '@mdi/js';
  import { t } from 'svelte-i18n';

  interface Props {
    dynamicAlbum: DynamicAlbumResponseDto;
    showOwner?: boolean;
    showDateRange?: boolean;
    showItemCount?: boolean;
    preload?: boolean;
    onShowContextMenu?: ((position: ContextMenuPosition) => unknown) | undefined;
    onClick?: (album: DynamicAlbumResponseDto) => void;
  }

  let {
    dynamicAlbum,
    showOwner = false,
    showDateRange = false,
    showItemCount = false,
    preload = false,
    onShowContextMenu = undefined,
    onClick = undefined,
  }: Props = $props();

  const showAlbumContextMenu = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onShowContextMenu?.(getContextMenuPositionFromEvent(e));
  };

  const handleClick = () => {
    if (onClick && dynamicAlbum) {
      onClick(dynamicAlbum);
    }
  };

  // Computed properties
  let hasFilters = $derived(dynamicAlbum?.filters && dynamicAlbum.filters.length > 0);
  let hasSharedUsers = $derived(dynamicAlbum?.sharedUsers && dynamicAlbum.sharedUsers.length > 0);
  let isOwner = $derived($user?.id === dynamicAlbum?.ownerId);
</script>

{#if dynamicAlbum}
  <div
    class="group relative rounded-2xl border border-transparent p-5 hover:bg-gray-100 hover:border-gray-200 dark:hover:border-gray-800 dark:hover:bg-gray-900 cursor-pointer"
    data-testid="dynamic-album-card"
    onclick={handleClick}
  >
    {#if onShowContextMenu}
      <div
        id="icon-{dynamicAlbum.id}"
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

    <!-- Dynamic Album Cover -->
    <div
      class="aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 transition-all duration-300 hover:shadow-lg"
    >
      <div class="flex h-full w-full items-center justify-center">
        <div class="text-center">
          <div class="mx-auto mb-2 h-16 w-16 text-blue-500 dark:text-blue-400">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
              />
            </svg>
          </div>
          <div class="text-sm font-medium text-blue-600 dark:text-blue-400">{$t('dynamic_album')}</div>
        </div>
      </div>
    </div>

    <div class="mt-4">
      <p
        class="w-full leading-6 text-lg line-clamp-2 font-semibold text-black dark:text-white group-hover:text-immich-primary dark:group-hover:text-immich-dark-primary"
        data-testid="dynamic-album-name"
        title={dynamicAlbum.name}
      >
        {dynamicAlbum.name}
      </p>

      {#if showDateRange && dynamicAlbum.startDate && dynamicAlbum.endDate}
        <p class="flex text-sm dark:text-immich-dark-fg capitalize">
          {new Date(dynamicAlbum.startDate).toLocaleDateString()} - {new Date(
            dynamicAlbum.endDate,
          ).toLocaleDateString()}
        </p>
      {/if}

      <span class="flex gap-2 text-sm dark:text-immich-dark-fg" data-testid="dynamic-album-details">
        {#if showItemCount}
          <p>
            {$t('items_count', { values: { count: dynamicAlbum.assetCount } })}
          </p>
        {/if}

        {#if (showOwner || hasSharedUsers) && showItemCount}
          <p>•</p>
        {/if}

        {#if showOwner}
          {#if isOwner}
            <p>{$t('owned')}</p>
          {:else}
            <p>{$t('shared')}</p>
          {/if}
        {:else if hasSharedUsers}
          <p>{$t('shared')}</p>
        {/if}
      </span>

      <!-- Description -->
      {#if dynamicAlbum.description}
        <p class="line-clamp-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
          {dynamicAlbum.description}
        </p>
      {/if}

      <!-- Filter indicators -->
      {#if hasFilters}
        <div class="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
          </svg>
          <span>{$t('has_filters')}</span>
        </div>
      {/if}
    </div>
  </div>
{/if}
