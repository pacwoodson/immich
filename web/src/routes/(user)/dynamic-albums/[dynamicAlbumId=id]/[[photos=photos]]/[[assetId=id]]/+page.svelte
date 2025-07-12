<script lang="ts">
  import { afterNavigate, goto, onNavigate } from '$app/navigation';
  import { scrollMemoryClearer } from '$lib/actions/scroll-memory';
  import CastButton from '$lib/cast/cast-button.svelte';
  import ActivityStatus from '$lib/components/asset-viewer/activity-status.svelte';
  import ActivityViewer from '$lib/components/asset-viewer/activity-viewer.svelte';
  import AddToAlbum from '$lib/components/photos-page/actions/add-to-album.svelte';
  import ArchiveAction from '$lib/components/photos-page/actions/archive-action.svelte';
  import ChangeDate from '$lib/components/photos-page/actions/change-date-action.svelte';
  import ChangeDescription from '$lib/components/photos-page/actions/change-description-action.svelte';
  import ChangeLocation from '$lib/components/photos-page/actions/change-location-action.svelte';
  import CreateSharedLink from '$lib/components/photos-page/actions/create-shared-link.svelte';
  import DeleteAssets from '$lib/components/photos-page/actions/delete-assets.svelte';
  import DownloadAction from '$lib/components/photos-page/actions/download-action.svelte';
  import FavoriteAction from '$lib/components/photos-page/actions/favorite-action.svelte';
  import SelectAllAssets from '$lib/components/photos-page/actions/select-all-assets.svelte';
  import SetVisibilityAction from '$lib/components/photos-page/actions/set-visibility-action.svelte';
  import TagAction from '$lib/components/photos-page/actions/tag-action.svelte';
  import AssetGrid from '$lib/components/photos-page/asset-grid.svelte';
  import AssetSelectControlBar from '$lib/components/photos-page/asset-select-control-bar.svelte';
  import ButtonContextMenu from '$lib/components/shared-components/context-menu/button-context-menu.svelte';
  import MenuOption from '$lib/components/shared-components/context-menu/menu-option.svelte';
  import ControlAppBar from '$lib/components/shared-components/control-app-bar.svelte';
  import {
    notificationController,
    NotificationType,
  } from '$lib/components/shared-components/notification/notification';
  import UserAvatar from '$lib/components/shared-components/user-avatar.svelte';
  import { AlbumPageViewMode, AppRoute } from '$lib/constants';
  import { activityManager } from '$lib/managers/activity-manager.svelte';
  import { TimelineManager } from '$lib/managers/timeline-manager/timeline-manager.svelte';
  import type { TimelineAsset } from '$lib/managers/timeline-manager/types';
  import { AssetInteraction } from '$lib/stores/asset-interaction.svelte';
  import { assetViewingStore } from '$lib/stores/asset-viewing.store';
  import { featureFlags } from '$lib/stores/server-config.store';
  import { SlideshowNavigation, SlideshowState, slideshowStore } from '$lib/stores/slideshow.store';
  import { preferences, user } from '$lib/stores/user.store';
  import { handlePromiseError } from '$lib/utils';
  import { cancelMultiselect, downloadAlbum } from '$lib/utils/asset-utils';
  import { confirmDynamicAlbumDelete } from '$lib/utils/dynamic-album-utils';
  import { handleError } from '$lib/utils/handle-error';
  import {
    isAlbumsRoute,
    isDynamicAlbumsRoute,
    isPeopleRoute,
    isSearchRoute,
    navigate,
    type AssetGridRouteSearchParams,
  } from '$lib/utils/navigation';
  import {
    AssetOrder,
    AssetVisibility,
    deleteDynamicAlbum,
    getDynamicAlbumInfo,
    updateDynamicAlbumInfo,
  } from '@immich/sdk';
  import { Button, IconButton } from '@immich/ui';
  import {
    mdiArrowLeft,
    mdiCogOutline,
    mdiDeleteOutline,
    mdiDotsVertical,
    mdiFolderDownloadOutline,
    mdiImageOutline,
    mdiPlus,
    mdiPresentationPlay,
    mdiShareVariantOutline,
  } from '@mdi/js';
  import { onDestroy } from 'svelte';
  import { t } from 'svelte-i18n';
  import { fly } from 'svelte/transition';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data = $bindable() }: Props = $props();

  let { isViewing: showAssetViewer, setAssetId, gridScrollTarget } = assetViewingStore;
  let { slideshowState, slideshowNavigation } = slideshowStore;

  let oldAt: AssetGridRouteSearchParams | null | undefined = $state();

  let backUrl: string = $state(AppRoute.DYNAMIC_ALBUMS);
  let viewMode: AlbumPageViewMode = $state(AlbumPageViewMode.VIEW);
  let isShowActivity = $state(false);
  let dynamicAlbumOrder: AssetOrder | undefined = $state(AssetOrder.Desc);

  const assetInteraction = new AssetInteraction();
  const timelineInteraction = new AssetInteraction();

  afterNavigate(({ from }) => {
    let url: string | undefined = from?.url?.pathname;

    const route = from?.route?.id;
    if (isSearchRoute(route)) {
      url = from?.url.href;
    }

    if (isAlbumsRoute(route) || isPeopleRoute(route)) {
      url = AppRoute.ALBUMS;
    }

    if (isDynamicAlbumsRoute(route)) {
      url = AppRoute.DYNAMIC_ALBUMS;
    }

    backUrl = url || AppRoute.DYNAMIC_ALBUMS;
  });

  const handleFavorite = async () => {
    try {
      await activityManager.toggleLike();
    } catch (error) {
      handleError(error, $t('errors.cant_change_asset_favorite'));
    }
  };

  const handleOpenAndCloseActivityTab = () => {
    isShowActivity = !isShowActivity;
  };

  const handleStartSlideshow = async () => {
    const asset =
      $slideshowNavigation === SlideshowNavigation.Shuffle
        ? await timelineManager.getRandomAsset()
        : timelineManager.months[0]?.dayGroups[0]?.viewerAssets[0]?.asset;
    if (asset) {
      handlePromiseError(setAssetId(asset.id).then(() => ($slideshowState = SlideshowState.PlaySlideshow)));
    }
  };

  const handleEscape = async () => {
    timelineManager.suspendTransitions = true;
    if (viewMode === AlbumPageViewMode.SELECT_THUMBNAIL) {
      viewMode = AlbumPageViewMode.VIEW;
      return;
    }
    if (viewMode === AlbumPageViewMode.SELECT_ASSETS) {
      await handleCloseSelectAssets();
      return;
    }
    if (viewMode === AlbumPageViewMode.OPTIONS) {
      viewMode = AlbumPageViewMode.VIEW;
      return;
    }
    if ($showAssetViewer) {
      return;
    }
    if (assetInteraction.selectionActive) {
      cancelMultiselect(assetInteraction);
      return;
    }
    await goto(backUrl);
    return;
  };

  const refreshDynamicAlbum = async () => {
    dynamicAlbum = await getDynamicAlbumInfo({ id: dynamicAlbum.id });
  };

  const setModeToView = async () => {
    timelineManager.suspendTransitions = true;
    viewMode = AlbumPageViewMode.VIEW;
    await navigate(
      { targetRoute: 'current', assetId: null, assetGridRouteSearchParams: { at: oldAt?.at } },
      { replaceState: true, forceNavigate: true },
    );
    oldAt = null;
  };

  const handleCloseSelectAssets = async () => {
    timelineInteraction.clearMultiselect();
    await setModeToView();
  };

  const handleDownloadDynamicAlbum = async () => {
    try {
      await downloadAlbum(dynamicAlbum);
    } catch (error) {
      handleError(error, $t('errors.unable_to_download_files'));
    }
  };

  const handleRemoveDynamicAlbum = async () => {
    const isConfirmed = await confirmDynamicAlbumDelete(dynamicAlbum);

    if (!isConfirmed) {
      viewMode = AlbumPageViewMode.VIEW;
      return;
    }

    try {
      await deleteDynamicAlbum({ id: dynamicAlbum.id });
      await goto(backUrl);
    } catch (error) {
      handleError(error, $t('errors.unable_to_delete_album'));
    } finally {
      viewMode = AlbumPageViewMode.VIEW;
    }
  };

  const handleSetVisibility = (assetIds: string[]) => {
    timelineManager.removeAssets(assetIds);
    assetInteraction.clearMultiselect();
  };

  const handleRemoveAssets = async (assetIds: string[]) => {
    timelineManager.removeAssets(assetIds);
    await refreshDynamicAlbum();
  };

  const handleUndoRemoveAssets = async (assets: TimelineAsset[]) => {
    timelineManager.addAssets(assets);
    await refreshDynamicAlbum();
  };

  onNavigate(async ({ to }) => {
    if (!isDynamicAlbumsRoute(to?.route.id) && dynamicAlbum.assetCount === 0 && !dynamicAlbum.name) {
      await deleteDynamicAlbum({ id: dynamicAlbum.id });
    }
  });

  let dynamicAlbum = $derived(data.dynamicAlbum);
  let dynamicAlbumId = $derived(dynamicAlbum.id);

  $effect(() => {
    if (!dynamicAlbum.isActivityEnabled && activityManager.commentCount === 0) {
      isShowActivity = false;
    }
  });

  let timelineManager = new TimelineManager();

  $effect(() => {
    if (viewMode === AlbumPageViewMode.VIEW) {
      // Use the new dynamicAlbumId support in TimelineManager
      void timelineManager.updateOptions({ dynamicAlbumId, order: dynamicAlbumOrder });
    } else if (viewMode === AlbumPageViewMode.SELECT_ASSETS) {
      void timelineManager.updateOptions({
        visibility: AssetVisibility.Timeline,
        withPartners: true,
      });
    }
  });

  const isShared = $derived(viewMode === AlbumPageViewMode.SELECT_ASSETS ? false : dynamicAlbum.sharedUsers.length > 0);

  $effect(() => {
    if ($showAssetViewer || !isShared) {
      return;
    }

    handlePromiseError(activityManager.init(dynamicAlbum.id));
  });

  onDestroy(() => {
    activityManager.reset();
    timelineManager.destroy();
  });

  let isOwned = $derived($user.id == dynamicAlbum.ownerId);

  let showActivityStatus = $derived(
    dynamicAlbum.sharedUsers.length > 0 &&
      !$showAssetViewer &&
      (dynamicAlbum.isActivityEnabled || activityManager.commentCount > 0),
  );
  let isEditor = $derived(
    dynamicAlbum.sharedUsers.find(({ userId }) => userId === $user.id)?.role === 'editor' ||
      dynamicAlbum.ownerId === $user.id,
  );

  let dynamicAlbumHasViewers = $derived(dynamicAlbum.sharedUsers.some(({ role }) => role === 'viewer'));
  const isSelectionMode = $derived(
    viewMode === AlbumPageViewMode.SELECT_ASSETS ? true : viewMode === AlbumPageViewMode.SELECT_THUMBNAIL,
  );
  const singleSelect = $derived(
    viewMode === AlbumPageViewMode.SELECT_ASSETS ? false : viewMode === AlbumPageViewMode.SELECT_THUMBNAIL,
  );
  const showArchiveIcon = $derived(viewMode !== AlbumPageViewMode.SELECT_ASSETS);
  const onSelect = ({ id }: { id: string }) => {
    if (viewMode !== AlbumPageViewMode.SELECT_ASSETS) {
      void handleUpdateThumbnail(id);
    }
  };
  const currentAssetIntersection = $derived(
    viewMode === AlbumPageViewMode.SELECT_ASSETS ? timelineInteraction : assetInteraction,
  );

  const handleShare = async () => {
    // TODO: Implement share functionality
    console.log('Share dynamic album not implemented yet');
  };

  const handleOptions = async () => {
    // TODO: Implement options functionality
    console.log('Dynamic album options not implemented yet');
  };

  const handleUpdateThumbnail = async (assetId: string) => {
    if (viewMode !== AlbumPageViewMode.SELECT_THUMBNAIL) {
      return;
    }

    await updateThumbnail(assetId);

    viewMode = AlbumPageViewMode.VIEW;
    assetInteraction.clearMultiselect();
  };

  const updateThumbnailUsingCurrentSelection = async () => {
    if (assetInteraction.selectedAssets.length === 1) {
      const [firstAsset] = assetInteraction.selectedAssets;
      assetInteraction.clearMultiselect();
      await updateThumbnail(firstAsset.id);
    }
  };

  const updateThumbnail = async (assetId: string) => {
    try {
      await updateDynamicAlbumInfo({
        id: dynamicAlbum.id,
        updateDynamicAlbumDto: {
          albumThumbnailAssetId: assetId,
        },
      });
      notificationController.show({
        type: NotificationType.Info,
        message: $t('album_cover_updated'),
      });
    } catch (error) {
      handleError(error, $t('errors.unable_to_update_album_cover'));
    }
  };
</script>

<div class="flex overflow-hidden" use:scrollMemoryClearer={{ routeStartsWith: AppRoute.DYNAMIC_ALBUMS }}>
  <div class="relative w-full shrink">
    <main class="relative h-dvh overflow-hidden px-2 md:px-6 max-md:pt-(--navbar-height-md) pt-(--navbar-height)">
      <AssetGrid
        enableRouting={viewMode === AlbumPageViewMode.SELECT_ASSETS ? false : true}
        {timelineManager}
        assetInteraction={currentAssetIntersection}
        {isShared}
        {isSelectionMode}
        {singleSelect}
        {showArchiveIcon}
        {onSelect}
        onEscape={handleEscape}
      >
        {#if viewMode !== AlbumPageViewMode.SELECT_ASSETS}
          {#if viewMode !== AlbumPageViewMode.SELECT_THUMBNAIL}
            <!-- DYNAMIC ALBUM TITLE -->
            <section class="pt-8 md:pt-24">
              <h1
                class="text-2xl md:text-4xl lg:text-6xl text-immich-primary outline-none transition-all dark:text-immich-dark-primary"
              >
                {dynamicAlbum.name}
              </h1>

              {#if dynamicAlbum.assetCount > 0}
                <span class="my-2 flex gap-2 text-sm font-medium text-gray-500">
                  <span>{dynamicAlbum.assetCount} {$t('items')}</span>
                </span>
              {/if}

              <!-- DYNAMIC ALBUM SHARING -->
              {#if dynamicAlbum.sharedUsers.length > 0}
                <div class="my-3 flex gap-x-1">
                  <!-- owner -->
                  <button type="button">
                    <UserAvatar
                      user={{
                        id: dynamicAlbum.ownerId,
                        name: 'Owner',
                        email: '',
                        profileImagePath: '',
                        avatarColor: '',
                        profileChangedAt: new Date(),
                      }}
                      size="md"
                    />
                  </button>

                  <!-- users with write access (collaborators) -->
                  {#each dynamicAlbum.sharedUsers.filter(({ role }) => role === 'editor') as sharedUser (sharedUser.userId)}
                    <button type="button">
                      <UserAvatar
                        user={{
                          id: sharedUser.userId,
                          name: 'Editor',
                          email: '',
                          profileImagePath: '',
                          avatarColor: '',
                          profileChangedAt: new Date(),
                        }}
                        size="md"
                      />
                    </button>
                  {/each}

                  <!-- display ellipsis if there are readonly users too -->
                  {#if dynamicAlbumHasViewers}
                    <IconButton
                      shape="round"
                      aria-label={$t('view_all_users')}
                      color="secondary"
                      size="medium"
                      icon={mdiDotsVertical}
                    />
                  {/if}
                </div>
              {/if}

              <!-- DYNAMIC ALBUM DESCRIPTION -->
              {#if dynamicAlbum.description}
                <p
                  class="whitespace-pre-line mb-12 mt-6 w-full pb-2 text-start font-medium text-base text-black dark:text-gray-300"
                >
                  {dynamicAlbum.description}
                </p>
              {/if}

              <!-- DYNAMIC ALBUM FILTERS -->
              {#if dynamicAlbum.filters.length > 0}
                <div class="mb-6">
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
            </section>
          {/if}

          {#if dynamicAlbum.assetCount === 0}
            <section id="empty-dynamic-album" class="mt-[200px] flex place-content-center place-items-center">
              <div class="w-[300px] text-center">
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
                <p class="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  {$t('no_assets_found')}
                </p>
              </div>
            </section>
          {/if}
        {/if}
      </AssetGrid>

      {#if showActivityStatus && !activityManager.isLoading}
        <div class="absolute z-2 bottom-0 end-0 mb-6 me-6 justify-self-end">
          <ActivityStatus
            disabled={!dynamicAlbum.isActivityEnabled}
            isLiked={activityManager.isLiked}
            numberOfComments={activityManager.commentCount}
            numberOfLikes={undefined}
            onFavorite={handleFavorite}
            onOpenActivityTab={handleOpenAndCloseActivityTab}
          />
        </div>
      {/if}
    </main>

    {#if assetInteraction.selectionActive}
      <AssetSelectControlBar
        assets={assetInteraction.selectedAssets}
        clearSelect={() => assetInteraction.clearMultiselect()}
      >
        <CreateSharedLink />
        <SelectAllAssets {timelineManager} {assetInteraction} />
        <ButtonContextMenu icon={mdiPlus} title={$t('add_to')}>
          <AddToAlbum />
          <AddToAlbum shared />
        </ButtonContextMenu>
        {#if assetInteraction.isAllUserOwned}
          <FavoriteAction
            removeFavorite={assetInteraction.isAllFavorite}
            onFavorite={(ids, isFavorite) =>
              timelineManager.updateAssetOperation(ids, (asset) => {
                asset.isFavorite = isFavorite;
                return { remove: false };
              })}
          />
        {/if}
        <ButtonContextMenu icon={mdiDotsVertical} title={$t('menu')} offset={{ x: 175, y: 25 }}>
          <DownloadAction menuItem filename="{dynamicAlbum.name}.zip" />
          {#if assetInteraction.isAllUserOwned}
            <ChangeDate menuItem />
            <ChangeDescription menuItem />
            <ChangeLocation menuItem />
            <ArchiveAction menuItem unarchive={assetInteraction.isAllArchived} />
            <SetVisibilityAction menuItem onVisibilitySet={handleSetVisibility} />
          {/if}

          {#if $preferences.tags.enabled && assetInteraction.isAllUserOwned}
            <TagAction menuItem />
          {/if}

          {#if assetInteraction.isAllUserOwned}
            <DeleteAssets menuItem onAssetDelete={handleRemoveAssets} onUndoDelete={handleUndoRemoveAssets} />
          {/if}
        </ButtonContextMenu>
      </AssetSelectControlBar>
    {:else}
      {#if viewMode === AlbumPageViewMode.VIEW}
        <ControlAppBar showBackButton backIcon={mdiArrowLeft} onClose={() => goto(backUrl)}>
          {#snippet trailing()}
            <CastButton />

            {#if isOwned}
              <IconButton
                shape="round"
                variant="ghost"
                color="secondary"
                aria-label={$t('share')}
                onclick={handleShare}
                icon={mdiShareVariantOutline}
              />
            {/if}

            {#if $featureFlags.loaded && $featureFlags.map}
              <!-- TODO: Implement dynamic album map -->
            {/if}

            {#if dynamicAlbum.assetCount > 0}
              <IconButton
                shape="round"
                variant="ghost"
                color="secondary"
                aria-label={$t('slideshow')}
                onclick={handleStartSlideshow}
                icon={mdiPresentationPlay}
              />
              <IconButton
                shape="round"
                variant="ghost"
                color="secondary"
                aria-label={$t('download')}
                onclick={handleDownloadDynamicAlbum}
                icon={mdiFolderDownloadOutline}
              />
            {/if}

            {#if isOwned}
              <ButtonContextMenu
                icon={mdiDotsVertical}
                title={$t('album_options')}
                color="secondary"
                offset={{ x: 175, y: 25 }}
              >
                {#if dynamicAlbum.assetCount > 0}
                  <MenuOption
                    icon={mdiImageOutline}
                    text={$t('select_album_cover')}
                    onClick={() => (viewMode = AlbumPageViewMode.SELECT_THUMBNAIL)}
                  />
                  <MenuOption icon={mdiCogOutline} text={$t('options')} onClick={handleOptions} />
                {/if}

                <MenuOption
                  icon={mdiDeleteOutline}
                  text={$t('delete_album')}
                  onClick={() => handleRemoveDynamicAlbum()}
                />
              </ButtonContextMenu>
            {/if}
          {/snippet}
        </ControlAppBar>
      {/if}

      {#if viewMode === AlbumPageViewMode.SELECT_ASSETS}
        <ControlAppBar onClose={handleCloseSelectAssets}>
          {#snippet leading()}
            <p class="text-lg dark:text-immich-dark-fg">
              {#if !timelineInteraction.selectionActive}
                {$t('add_to_album')}
              {:else}
                {$t('selected_count', { values: { count: timelineInteraction.selectedAssets.length } })}
              {/if}
            </p>
          {/snippet}

          {#snippet trailing()}
            <Button size="small" disabled={!timelineInteraction.selectionActive}>
              {$t('done')}
            </Button>
          {/snippet}
        </ControlAppBar>
      {/if}

      {#if viewMode === AlbumPageViewMode.SELECT_THUMBNAIL}
        <ControlAppBar onClose={() => (viewMode = AlbumPageViewMode.VIEW)}>
          {#snippet leading()}
            {$t('select_album_cover')}
          {/snippet}
        </ControlAppBar>
      {/if}
    {/if}
  </div>
  {#if dynamicAlbum.sharedUsers.length > 0 && dynamicAlbum && isShowActivity && $user && !$showAssetViewer}
    <div class="flex">
      <div
        transition:fly={{ duration: 150 }}
        id="activity-panel"
        class="z-2 w-[360px] md:w-[460px] overflow-y-auto transition-all dark:border-l dark:border-s-immich-dark-gray"
        translate="yes"
      >
        <ActivityViewer
          user={$user}
          disabled={!dynamicAlbum.isActivityEnabled}
          albumOwnerId={dynamicAlbum.ownerId}
          albumId={dynamicAlbum.id}
          onClose={handleOpenAndCloseActivityTab}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  ::placeholder {
    color: rgb(60, 60, 60);
    opacity: 0.6;
  }

  ::-ms-input-placeholder {
    /* Edge 12 -18 */
    color: white;
  }
</style>
