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
  import { modalManager } from '$lib/managers/modal-manager.svelte';
  import DynamicAlbumShareModal from '$lib/modals/DynamicAlbumShareModal.svelte';
  import DynamicAlbumOptionsModal from '$lib/modals/DynamicAlbumOptionsModal.svelte';
  import QrCodeModal from '$lib/modals/QrCodeModal.svelte';
  import SharedLinkCreateModal from '$lib/modals/SharedLinkCreateModal.svelte';
  import { activityManager } from '$lib/managers/activity-manager.svelte';
  import { TimelineManager } from '$lib/managers/timeline-manager/timeline-manager.svelte';
  import type { TimelineAsset } from '$lib/managers/timeline-manager/types';
  import { AssetInteraction } from '$lib/stores/asset-interaction.svelte';
  import { assetViewingStore } from '$lib/stores/asset-viewing.store';
  import { featureFlags } from '$lib/stores/server-config.store';
  import { SlideshowNavigation, SlideshowState, slideshowStore } from '$lib/stores/slideshow.store';
  import { preferences, user } from '$lib/stores/user.store';
  import { handlePromiseError, makeSharedLinkUrl } from '$lib/utils';
  import { cancelMultiselect, downloadDynamicAlbum } from '$lib/utils/asset-utils';
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
    getAllTags,
    updateDynamicAlbumInfo,
    type TagResponseDto,
    shareDynamicAlbum,
    type DynamicAlbumShareDto,
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
  import { onDestroy, onMount } from 'svelte';
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
    
    // Refresh timeline manager to reflect the updated dynamic album content
    if (viewMode === AlbumPageViewMode.VIEW) {
      // Force a reload by adding a timestamp to make the options different
      await timelineManager.updateOptions({ 
        dynamicAlbumId: dynamicAlbum.id, 
        order: dynamicAlbumOrder,
        // Add a timestamp to force reload when filters change
        ...(dynamicAlbum.updatedAt && { _forceReload: new Date(dynamicAlbum.updatedAt).getTime() })
      });
    }
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
      await downloadDynamicAlbum(dynamicAlbum);
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
  
  // Fetch tags for displaying tag names
  let allTags: TagResponseDto[] = $state([]);
  let tagMap = $derived(Object.fromEntries(allTags.map((tag) => [tag.id, tag])));
  
  onMount(async () => {
    try {
      allTags = await getAllTags();
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  });

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
    const result = await modalManager.show(DynamicAlbumShareModal, { album: dynamicAlbum });
    
    switch (result?.action) {
      case 'sharedUsers': {
        // Handle user sharing
        await handleAddUsers(result.data);
        return;
      }

      case 'sharedLink': {
        // Handle link sharing
        await handleShareLink();
        return;
      }
    }
  };

  const handleShareLink = async () => {
    const sharedLink = await modalManager.show(SharedLinkCreateModal, { dynamicAlbumId: dynamicAlbum.id });

    if (sharedLink) {
      await modalManager.show(QrCodeModal, { title: $t('view_link'), value: makeSharedLinkUrl(sharedLink.key) });
    }
  };

  const handleAddUsers = async (users: DynamicAlbumShareDto[]) => {
    // Share with each user
    for (const user of users) {
      await shareDynamicAlbum({
        id: dynamicAlbum.id,
        shareDynamicAlbumDto: user,
      });
    }

    // Refresh the dynamic album to get updated shared users
    await refreshDynamicAlbum();
  };

  const handleOptions = async () => {
    const result = await modalManager.show(DynamicAlbumOptionsModal, { album: dynamicAlbum, order: dynamicAlbumOrder, user: $user });

    if (!result) {
      return;
    }

    switch (result.action) {
      case 'changeOrder': {
        dynamicAlbumOrder = result.order;
        break;
      }
      case 'shareUser': {
        await handleShare();
        break;
      }
      case 'refreshAlbum': {
        await refreshDynamicAlbum();
        break;
      }
      case 'editFilters': {
        await refreshDynamicAlbum();
        break;
      }
    }
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
                        name: $t('owner'),
                        email: '',
                        profileImagePath: '',
                        avatarColor: '',
                        profileChangedAt: new Date(),
                      }}
                      size="md"
                    />
                  </button>

                  <!-- shared users -->
                  {#each dynamicAlbum.sharedUsers as sharedUser (sharedUser.userId)}
                    <button type="button">
                      <UserAvatar
                        user={{
                          id: sharedUser.userId,
                          name: $t(sharedUser.role === 'editor' ? 'role_editor' : 'role_viewer'),
                          email: '',
                          profileImagePath: '',
                          avatarColor: '',
                          profileChangedAt: new Date(),
                        }}
                        size="md"
                      />
                    </button>
                  {/each}
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
                      <div class="flex items-start gap-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                        <div
                          class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 text-sm font-medium"
                        >
                          {index + 1}
                        </div>

                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-medium text-gray-900 dark:text-white mb-1">
                            {$t(`filter_type_${filter.type}`)}
                          </div>
                          
                          <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                            {#if filter.value && typeof filter.value === 'object'}
                              <!-- Tag Filter -->
                              {#if filter.type === 'tag' && filter.value.tagIds}
                                <div class="flex items-center gap-2">
                                  <span class="font-medium">{$t(filter.value.operator === 'and' ? 'operator_and' : 'operator_or')}:</span>
                                  <span>{filter.value.tagIds.length} {$t('tags')}</span>
                                </div>
                                {#if filter.value.tagIds.length > 0}
                                  <div class="text-xs text-gray-400 dark:text-gray-500">
                                    {filter.value.tagIds.slice(0, 3).map(tagId => tagMap[tagId]?.name || tagId).join(', ')}{filter.value.tagIds.length > 3 ? '...' : ''}
                                  </div>
                                {/if}
                              {/if}

                              <!-- Person Filter -->
                              {#if filter.type === 'person' && filter.value.personIds}
                                <div class="flex items-center gap-2">
                                  <span class="font-medium">{$t(filter.value.operator === 'and' ? 'operator_and' : 'operator_or')}:</span>
                                  <span>{filter.value.personIds.length} {$t('people')}</span>
                                </div>
                                {#if filter.value.personIds.length > 0}
                                  <div class="text-xs text-gray-400 dark:text-gray-500">
                                    IDs: {filter.value.personIds.slice(0, 3).join(', ')}{filter.value.personIds.length > 3 ? '...' : ''}
                                  </div>
                                {/if}
                              {/if}

                              <!-- Location Filter -->
                              {#if filter.type === 'location'}
                                <div class="space-y-1">
                                  {#if filter.value.cities && filter.value.cities.length > 0}
                                    <div class="flex items-center gap-2">
                                      <span class="font-medium">{$t('cities')}:</span>
                                      <span>{filter.value.cities.length} {$t('cities')}</span>
                                    </div>
                                    <div class="text-xs text-gray-400 dark:text-gray-500 ml-4">
                                      {filter.value.cities.slice(0, 3).join(', ')}{filter.value.cities.length > 3 ? '...' : ''}
                                    </div>
                                  {/if}
                                  {#if filter.value.countries && filter.value.countries.length > 0}
                                    <div class="flex items-center gap-2">
                                      <span class="font-medium">{$t('countries')}:</span>
                                      <span>{filter.value.countries.length} {$t('countries')}</span>
                                    </div>
                                    <div class="text-xs text-gray-400 dark:text-gray-500 ml-4">
                                      {filter.value.countries.slice(0, 3).join(', ')}{filter.value.countries.length > 3 ? '...' : ''}
                                    </div>
                                  {/if}
                                  {#if filter.value.states && filter.value.states.length > 0}
                                    <div class="flex items-center gap-2">
                                      <span class="font-medium">{$t('states')}:</span>
                                      <span>{filter.value.states.length} {$t('states')}</span>
                                    </div>
                                    <div class="text-xs text-gray-400 dark:text-gray-500 ml-4">
                                      {filter.value.states.slice(0, 3).join(', ')}{filter.value.states.length > 3 ? '...' : ''}
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
                                  {#if filter.value.field}
                                    <div class="text-xs text-gray-400 dark:text-gray-500">
                                      Field: {filter.value.field}
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
                                      <span>{filter.value.types.map(type => $t(type === 'image' ? 'images' : 'videos')).join(', ')}</span>
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

                              <!-- Metadata Filter -->
                              {#if filter.type === 'metadata'}
                                <div class="text-xs text-gray-400 dark:text-gray-500">
                                  {JSON.stringify(filter.value)}
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
