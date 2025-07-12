<script lang="ts">
  import { shortcut } from '$lib/actions/shortcut';
  import CastButton from '$lib/cast/cast-button.svelte';
  import SelectAllAssets from '$lib/components/photos-page/actions/select-all-assets.svelte';
  import AssetSelectControlBar from '$lib/components/photos-page/asset-select-control-bar.svelte';
  import { TimelineManager } from '$lib/managers/timeline-manager/timeline-manager.svelte';
  import { AssetInteraction } from '$lib/stores/asset-interaction.svelte';
  import { assetViewingStore } from '$lib/stores/asset-viewing.store';
  import { dragAndDropFilesStore } from '$lib/stores/drag-and-drop-files.store';
  import { featureFlags } from '$lib/stores/server-config.store';
  import { handlePromiseError } from '$lib/utils';
  import { cancelMultiselect, downloadDynamicAlbum } from '$lib/utils/asset-utils';
  import { fileUploadHandler, openFileUploadDialog } from '$lib/utils/file-uploader';
  import type { DynamicAlbumResponseDto, SharedLinkResponseDto, UserResponseDto } from '@immich/sdk';
  import { IconButton } from '@immich/ui';
  import { mdiFileImagePlusOutline, mdiFolderDownloadOutline } from '@mdi/js';
  import { onDestroy } from 'svelte';
  import { t } from 'svelte-i18n';
  import DownloadAction from '../photos-page/actions/download-action.svelte';
  import AssetGrid from '../photos-page/asset-grid.svelte';
  import ControlAppBar from '../shared-components/control-app-bar.svelte';
  import ImmichLogoSmallLink from '../shared-components/immich-logo-small-link.svelte';
  import ThemeButton from '../shared-components/theme-button.svelte';

  interface Props {
    sharedLink: SharedLinkResponseDto;
    user?: UserResponseDto | undefined;
  }

  let { sharedLink, user = undefined }: Props = $props();

  const dynamicAlbum = sharedLink.dynamicAlbum as DynamicAlbumResponseDto;

  let { isViewing: showAssetViewer } = assetViewingStore;

  const timelineManager = new TimelineManager();
  $effect(() => void timelineManager.updateOptions({ dynamicAlbumId: dynamicAlbum.id }));
  onDestroy(() => timelineManager.destroy());

  const assetInteraction = new AssetInteraction();

  // Note: File upload to dynamic albums is not yet supported
  // dragAndDropFilesStore.subscribe((value) => {
  //   if (value.isDragging && value.files.length > 0) {
  //     handlePromiseError(fileUploadHandler({ files: value.files, albumId: dynamicAlbum.id }));
  //     dragAndDropFilesStore.set({ isDragging: false, files: [] });
  //   }
  // });
</script>

<svelte:document
  use:shortcut={{
    shortcut: { key: 'Escape' },
    onShortcut: () => {
      if (!$showAssetViewer && assetInteraction.selectionActive) {
        cancelMultiselect(assetInteraction);
      }
    },
  }}
/>

<main class="relative h-dvh overflow-hidden px-2 md:px-6 max-md:pt-(--navbar-height-md) pt-(--navbar-height)">
  <AssetGrid
    enableRouting={true}
    {timelineManager}
    assetInteraction={assetInteraction}
  >
    <section class="pt-8 md:pt-24 px-2 md:px-0">
      <!-- DYNAMIC ALBUM TITLE -->
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

      <!-- DYNAMIC ALBUM DESCRIPTION -->
      {#if dynamicAlbum.description}
        <p
          class="whitespace-pre-line mb-12 mt-6 w-full pb-2 text-start font-medium text-base text-black dark:text-gray-300"
        >
          {dynamicAlbum.description}
        </p>
      {/if}
    </section>
  </AssetGrid>
</main>

<header>
  {#if assetInteraction.selectionActive}
    <AssetSelectControlBar
      ownerId={user?.id}
      assets={assetInteraction.selectedAssets}
      clearSelect={() => assetInteraction.clearMultiselect()}
    >
      <SelectAllAssets {timelineManager} {assetInteraction} />
      {#if sharedLink.allowDownload}
        <DownloadAction filename="{dynamicAlbum.name}.zip" />
      {/if}
    </AssetSelectControlBar>
  {:else}
    <ControlAppBar showBackButton={false}>
      {#snippet leading()}
        <ImmichLogoSmallLink />
      {/snippet}

      {#snippet trailing()}
        <CastButton />

        {#if sharedLink.allowUpload}
          <!-- Note: File upload to dynamic albums is not yet supported -->
          <!-- <IconButton
            shape="round"
            color="secondary"
            variant="ghost"
            aria-label={$t('add_photos')}
            onclick={() => openFileUploadDialog({ dynamicAlbumId: dynamicAlbum.id })}
            icon={mdiFileImagePlusOutline}
          /> -->
        {/if}

        {#if dynamicAlbum.assetCount > 0 && sharedLink.allowDownload}
          <IconButton
            shape="round"
            color="secondary"
            variant="ghost"
            aria-label={$t('download')}
            onclick={() => downloadDynamicAlbum(dynamicAlbum)}
            icon={mdiFolderDownloadOutline}
          />
        {/if}
        {#if sharedLink.showMetadata && $featureFlags.loaded && $featureFlags.map}
          <!-- TODO: Implement dynamic album map -->
        {/if}
        <ThemeButton />
      {/snippet}
    </ControlAppBar>
  {/if}
</header> 