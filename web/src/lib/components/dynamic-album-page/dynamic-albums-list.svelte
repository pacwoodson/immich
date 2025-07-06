<script lang="ts">
  import { goto } from '$app/navigation';
  import DynamicAlbumCard from '$lib/components/dynamic-album-page/dynamic-album-card.svelte';
  import MenuOption from '$lib/components/shared-components/context-menu/menu-option.svelte';
  import RightClickContextMenu from '$lib/components/shared-components/context-menu/right-click-context-menu.svelte';
  import {
    NotificationType,
    notificationController,
  } from '$lib/components/shared-components/notification/notification';
  import { AppRoute } from '$lib/constants';
  import { user } from '$lib/stores/user.store';
  import type { ContextMenuPosition } from '$lib/utils/context-menu';
  import { deleteDynamicAlbum, type DynamicAlbumResponseDto } from '$lib/utils/dynamic-album-api';
  import { confirmDynamicAlbumDelete } from '$lib/utils/dynamic-album-utils';
  import { normalizeSearchString } from '$lib/utils/string-utils';
  import { mdiDeleteOutline, mdiRenameOutline, mdiShareVariantOutline } from '@mdi/js';
  import { type Snippet } from 'svelte';
  import { t } from 'svelte-i18n';

  interface Props {
    ownedDynamicAlbums?: DynamicAlbumResponseDto[];
    sharedDynamicAlbums?: DynamicAlbumResponseDto[];
    searchQuery?: string;
    allowEdit?: boolean;
    empty?: Snippet;
  }

  let {
    ownedDynamicAlbums = $bindable([]),
    sharedDynamicAlbums = $bindable([]),
    searchQuery = '',
    allowEdit = false,
    empty,
  }: Props = $props();

  let allDynamicAlbums = $derived(() => {
    const userId = $user.id;
    const nonOwnedAlbums = sharedDynamicAlbums.filter((album) => album.ownerId !== userId);
    return nonOwnedAlbums.length > 0 ? ownedDynamicAlbums.concat(nonOwnedAlbums) : ownedDynamicAlbums;
  });

  let filteredDynamicAlbums = $derived(() => {
    if (searchQuery) {
      const searchQueryNormalized = normalizeSearchString(searchQuery);
      return allDynamicAlbums.filter((album) => {
        return normalizeSearchString(album.name).includes(searchQueryNormalized);
      });
    } else {
      return allDynamicAlbums;
    }
  });

  let contextMenuPosition: ContextMenuPosition = $state({ x: 0, y: 0 });
  let contextMenuTargetAlbum: DynamicAlbumResponseDto | undefined = $state();
  let isOpen = $state(false);

  let showFullContextMenu = $derived(
    allowEdit && contextMenuTargetAlbum && contextMenuTargetAlbum.ownerId === $user.id,
  );

  const showDynamicAlbumContextMenu = (contextMenuDetail: ContextMenuPosition, album: DynamicAlbumResponseDto) => {
    contextMenuTargetAlbum = album;
    contextMenuPosition = {
      x: contextMenuDetail.x,
      y: contextMenuDetail.y,
    };
    isOpen = true;
  };

  const closeDynamicAlbumContextMenu = () => {
    isOpen = false;
  };

  const handleDeleteDynamicAlbum = async (albumToDelete: DynamicAlbumResponseDto) => {
    try {
      await deleteDynamicAlbum(albumToDelete.id);
      ownedDynamicAlbums = ownedDynamicAlbums.filter(({ id }) => id !== albumToDelete.id);
      sharedDynamicAlbums = sharedDynamicAlbums.filter(({ id }) => id !== albumToDelete.id);
    } catch (error) {
      notificationController.show({
        message: $t('errors.unable_to_delete_album'),
        type: NotificationType.Error,
      });
    }
  };

  const setAlbumToDelete = async () => {
    const albumToDelete = contextMenuTargetAlbum;
    closeDynamicAlbumContextMenu();

    if (!albumToDelete) return;

    const isConfirmed = await confirmDynamicAlbumDelete(albumToDelete);
    if (isConfirmed) {
      await handleDeleteDynamicAlbum(albumToDelete);
    }
  };

  const handleEdit = async (album: DynamicAlbumResponseDto) => {
    closeDynamicAlbumContextMenu();
    // TODO: Implement edit modal
    console.log('Edit dynamic album modal not implemented yet');
  };

  const handleShare = async (album: DynamicAlbumResponseDto) => {
    closeDynamicAlbumContextMenu();
    // TODO: Implement share modal
    console.log('Share dynamic album modal not implemented yet');
  };

  const handleDynamicAlbumClick = (album: DynamicAlbumResponseDto) => {
    goto(`${AppRoute.DYNAMIC_ALBUMS}/${album.id}`);
  };
</script>

{#if filteredDynamicAlbums.length === 0}
  {#if empty}
    {@render empty()}
  {/if}
{:else}
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
    {#each filteredDynamicAlbums as dynamicAlbum (dynamicAlbum.id)}
      <DynamicAlbumCard
        {dynamicAlbum}
        {allowEdit}
        onContextMenu={(detail) => showDynamicAlbumContextMenu(detail, dynamicAlbum)}
        onClick={() => handleDynamicAlbumClick(dynamicAlbum)}
      />
    {/each}
  </div>
{/if}

<RightClickContextMenu {isOpen} {contextMenuPosition} onClose={closeDynamicAlbumContextMenu}>
  {#if showFullContextMenu}
    <MenuOption icon={mdiRenameOutline} text={$t('rename')} onClick={() => handleEdit(contextMenuTargetAlbum!)} />
    <MenuOption icon={mdiShareVariantOutline} text={$t('share')} onClick={() => handleShare(contextMenuTargetAlbum!)} />
    <MenuOption icon={mdiDeleteOutline} text={$t('delete')} onClick={setAlbumToDelete} />
  {/if}
</RightClickContextMenu>
