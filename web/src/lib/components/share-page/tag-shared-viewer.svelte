<script lang="ts">
  import { goto } from '$app/navigation';
  import type { Action } from '$lib/components/asset-viewer/actions/action';
  import DownloadAction from '$lib/components/timeline/actions/DownloadAction.svelte';
  import AssetSelectControlBar from '$lib/components/timeline/AssetSelectControlBar.svelte';
  import { AppRoute, AssetAction } from '$lib/constants';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import type { Viewport } from '$lib/managers/timeline-manager/types';
  import { AssetInteraction } from '$lib/stores/asset-interaction.svelte';
  import { cancelMultiselect, downloadArchive } from '$lib/utils/asset-utils';
  import { toTimelineAsset } from '$lib/utils/timeline-util';
  import { getAssetInfo, type SharedLinkResponseDto } from '@immich/sdk';
  import { IconButton, Logo } from '@immich/ui';
  import { mdiArrowLeft, mdiDownload, mdiSelectAll, mdiTag } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import ControlAppBar from '../shared-components/control-app-bar.svelte';
  import GalleryViewer from '../shared-components/gallery-viewer/gallery-viewer.svelte';

  interface Props {
    sharedLink: SharedLinkResponseDto;
    isOwned: boolean;
  }

  let { sharedLink, isOwned }: Props = $props();

  const viewport: Viewport = $state({ width: 0, height: 0 });
  const assetInteraction = new AssetInteraction();

  let assets = $derived(sharedLink.tag.assets.map((a) => toTimelineAsset(a)));

  const downloadAssets = async () => {
    const filename = sharedLink.tag?.name ? `${sharedLink.tag.name}-shared.zip` : 'immich-tag-shared.zip';
    await downloadArchive(filename, { assetIds: assets.map((asset) => asset.id) });
  };

  const handleSelectAll = () => {
    assetInteraction.selectAssets(assets);
  };

  const handleAction = async (action: Action) => {
    switch (action.type) {
      case AssetAction.ARCHIVE:
      case AssetAction.DELETE:
      case AssetAction.TRASH: {
        await goto(AppRoute.PHOTOS);
        break;
      }
    }
  };
</script>

<section>
  {#if assets.length > 1}
    {#if assetInteraction.selectionActive}
      <AssetSelectControlBar
        assets={assetInteraction.selectedAssets}
        clearSelect={() => cancelMultiselect(assetInteraction)}
      >
        <IconButton
          shape="round"
          color="secondary"
          variant="ghost"
          aria-label={$t('select_all')}
          icon={mdiSelectAll}
          onclick={handleSelectAll}
        />
        {#if sharedLink?.allowDownload}
          <DownloadAction filename={sharedLink.tag?.name ? `${sharedLink.tag.name}.zip` : 'immich-shared.zip'} />
        {/if}
      </AssetSelectControlBar>
    {:else}
      <ControlAppBar onClose={() => goto(AppRoute.PHOTOS)} backIcon={mdiArrowLeft} showBackButton={false}>
        {#snippet leading()}
          <a data-sveltekit-preload-data="hover" class="ms-4" href="/">
            <Logo variant="inline" />
          </a>
        {/snippet}

        {#snippet trailing()}
          {#if sharedLink?.allowDownload}
            <IconButton
              shape="round"
              color="secondary"
              variant="ghost"
              aria-label={$t('download')}
              onclick={downloadAssets}
              icon={mdiDownload}
            />
          {/if}
        {/snippet}
      </ControlAppBar>
    {/if}

    <!-- Tag information header -->
    {#if sharedLink.tag}
      <section class="mt-24 mb-8 mx-4">
        <div class="flex items-center gap-3">
          <IconButton
            shape="round"
            color="primary"
            variant="solid"
            icon={mdiTag}
            style="background-color: {sharedLink.tag.color || '#6366f1'};"
          />
          <div>
            <h1 class="text-2xl md:text-4xl text-primary font-semibold">
              {sharedLink.tag.name}
            </h1>
            {#if sharedLink.description}
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {sharedLink.description}
              </p>
            {/if}
            <p class="text-sm text-gray-500 dark:text-gray-500 mt-1">
              {$t('shared_photos_and_videos_count', { values: { assetCount: assets.length } })}
            </p>
          </div>
        </div>
      </section>
    {/if}

    <section class="mb-40 mx-4" bind:clientHeight={viewport.height} bind:clientWidth={viewport.width}>
      <GalleryViewer {assets} {assetInteraction} {viewport} />
    </section>
  {:else if assets.length === 1}
    {#await getAssetInfo({ ...authManager.params, id: assets[0].id }) then asset}
      {#await import('$lib/components/asset-viewer/asset-viewer.svelte') then { default: AssetViewer }}
        <AssetViewer
          {asset}
          showCloseButton={false}
          onAction={handleAction}
          onPrevious={() => Promise.resolve(false)}
          onNext={() => Promise.resolve(false)}
          onRandom={() => Promise.resolve(undefined)}
          onClose={() => {}}
        />
      {/await}
    {/await}
  {:else}
    <!-- Empty state for tag with no assets -->
    <section class="flex flex-col items-center justify-center h-full mt-40">
      <IconButton
        shape="round"
        color="primary"
        variant="solid"
        icon={mdiTag}
        style="background-color: {sharedLink.tag?.color || '#6366f1'};"
        size="lg"
      />
      <h2 class="text-2xl text-primary font-semibold mt-4">
        {sharedLink.tag?.name || $t('shared_tag')}
      </h2>
      <p class="text-gray-500 dark:text-gray-400 mt-2">
        {$t('no_assets_in_this_tag')}
      </p>
    </section>
  {/if}
</section>
