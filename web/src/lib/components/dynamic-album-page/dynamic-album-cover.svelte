<script lang="ts">
  import AssetCover from '$lib/components/sharedlinks-page/covers/asset-cover.svelte';
  import NoCover from '$lib/components/sharedlinks-page/covers/no-cover.svelte';
  import { getAssetThumbnailUrl } from '$lib/utils';
  import { type DynamicAlbumResponseDto } from '@immich/sdk';
  import { t } from 'svelte-i18n';

  interface Props {
    dynamicAlbum: DynamicAlbumResponseDto;
    preload?: boolean;
    class?: string;
  }

  let { dynamicAlbum, preload = false, class: className = '' }: Props = $props();

  let alt = $derived(dynamicAlbum.name || $t('unnamed_dynamic_album'));
  let thumbnailUrl = $derived(
    dynamicAlbum.albumThumbnailAssetId ? getAssetThumbnailUrl({ id: dynamicAlbum.albumThumbnailAssetId }) : null,
  );
</script>

{#if thumbnailUrl}
  <AssetCover {alt} class={className} src={thumbnailUrl} {preload} />
{:else}
  <NoCover {alt} class={className} {preload} />
{/if}
