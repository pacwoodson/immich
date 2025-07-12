<script lang="ts">
  import MenuOption from '$lib/components/shared-components/context-menu/menu-option.svelte';
  import RightClickContextMenu from '$lib/components/shared-components/context-menu/right-click-context-menu.svelte';
  import {
    NotificationType,
    notificationController,
  } from '$lib/components/shared-components/notification/notification';
  import { AppRoute } from '$lib/constants';
  import { modalManager } from '$lib/managers/modal-manager.svelte';
  import EditDynamicAlbumModal from '$lib/modals/EditDynamicAlbumModal.svelte';
  import ShareDynamicAlbumModal from '$lib/modals/ShareDynamicAlbumModal.svelte';
  import { user } from '$lib/stores/user.store';
  import type { ContextMenuPosition } from '$lib/utils/context-menu';
  import { confirmDynamicAlbumDelete } from '$lib/utils/dynamic-album-utils';
  import { normalizeSearchString } from '$lib/utils/string-utils';
  import * as sdk from '@immich/sdk';
  import { mdiDeleteOutline, mdiDownloadOutline, mdiRenameOutline, mdiShareVariantOutline } from '@mdi/js';
  import { type Snippet } from 'svelte';
  import { t } from 'svelte-i18n';
  import { run } from 'svelte/legacy';
  import DynamicAlbumCard from './dynamic-album-card.svelte';

  interface Props {
    ownedDynamicAlbums?: sdk.DynamicAlbumResponseDto[];
    sharedDynamicAlbums?: sdk.DynamicAlbumResponseDto[];
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

  let allDynamicAlbums: sdk.DynamicAlbumResponseDto[] = $state([]);
  let filteredDynamicAlbums: sdk.DynamicAlbumResponseDto[] = $state([]);

  let contextMenuPosition: ContextMenuPosition = $state({ x: 0, y: 0 });
  let contextMenuTargetAlbum: sdk.DynamicAlbumResponseDto | undefined = $state();
  let isOpen = $state(false);

  // Step 1: Combine owned and shared albums
  run(() => {
    const userId = $user?.id;

    if (!userId) {
      allDynamicAlbums = ownedDynamicAlbums;
      return;
    }

    const nonOwnedAlbums = sharedDynamicAlbums.filter((album) => album.ownerId !== userId);
    allDynamicAlbums = nonOwnedAlbums.length > 0 ? ownedDynamicAlbums.concat(nonOwnedAlbums) : ownedDynamicAlbums;
  });

  // Step 2: Filter using search query
  run(() => {
    if (searchQuery) {
      const searchQueryNormalized = normalizeSearchString(searchQuery);
      filteredDynamicAlbums = allDynamicAlbums.filter((album) => {
        return normalizeSearchString(album.name).includes(searchQueryNormalized);
      });
    } else {
      filteredDynamicAlbums = allDynamicAlbums;
    }
  });

  let showFullContextMenu = $derived(
    allowEdit && contextMenuTargetAlbum && contextMenuTargetAlbum.ownerId === $user?.id,
  );

  const showDynamicAlbumContextMenu = (contextMenuDetail: ContextMenuPosition, album: sdk.DynamicAlbumResponseDto) => {
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

  const handleDeleteDynamicAlbum = async (albumToDelete: sdk.DynamicAlbumResponseDto) => {
    try {
      await sdk.deleteDynamicAlbum({ id: albumToDelete.id });
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

  const handleEdit = async (album: sdk.DynamicAlbumResponseDto) => {
    closeDynamicAlbumContextMenu();
    const editedAlbum = await modalManager.show(EditDynamicAlbumModal, { album });
    if (editedAlbum) {
      // Update the album in the list
      const updateAlbumInList = (list: sdk.DynamicAlbumResponseDto[]) => {
        const index = list.findIndex((a) => a.id === editedAlbum.id);
        if (index !== -1) {
          list[index] = editedAlbum;
        }
      };
      updateAlbumInList(ownedDynamicAlbums);
      updateAlbumInList(sharedDynamicAlbums);
    }
  };

  const handleShare = async (album: sdk.DynamicAlbumResponseDto) => {
    closeDynamicAlbumContextMenu();
    const result = await modalManager.show(ShareDynamicAlbumModal, { album });
    if (result?.action === 'sharedUsers') {
      notificationController.show({
        message: $t('dynamic_album_shared_successfully'),
        type: NotificationType.Info,
      });
    }
  };

  const handleDownload = async (album: sdk.DynamicAlbumResponseDto) => {
    closeDynamicAlbumContextMenu();
    try {
      await downloadDynamicAlbum(album);
    } catch (error) {
      handleError(error, $t('errors.unable_to_download_files'));
    }
  };
</script>

{#if filteredDynamicAlbums.length > 0}
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
    {#each filteredDynamicAlbums as dynamicAlbum, index (dynamicAlbum.id)}
      <a data-sveltekit-preload-data="hover" href="{AppRoute.DYNAMIC_ALBUMS}/{dynamicAlbum.id}">
        <DynamicAlbumCard
          {dynamicAlbum}
          showOwner={allowEdit}
          showDateRange={true}
          showItemCount={true}
          preload={index < 20}
          onShowContextMenu={allowEdit ? (position) => showDynamicAlbumContextMenu(position, dynamicAlbum) : undefined}
        />
      </a>
    {/each}
  </div>
{:else}
  {@render empty?.()}
{/if}

<RightClickContextMenu
  title={$t('album_options')}
  {...contextMenuPosition}
  {isOpen}
  onClose={closeDynamicAlbumContextMenu}
>
  <MenuOption icon={mdiDownloadOutline} text={$t('download')} onClick={() => handleDownload(contextMenuTargetAlbum!)} />
  {#if showFullContextMenu}
    <MenuOption icon={mdiRenameOutline} text={$t('rename')} onClick={() => handleEdit(contextMenuTargetAlbum!)} />
    <MenuOption icon={mdiShareVariantOutline} text={$t('share')} onClick={() => handleShare(contextMenuTargetAlbum!)} />
    <MenuOption icon={mdiDeleteOutline} text={$t('delete')} onClick={setAlbumToDelete} />
  {/if}
</RightClickContextMenu>
