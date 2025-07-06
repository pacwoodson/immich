<script lang="ts">
  import { scrollMemory } from '$lib/actions/scroll-memory';
  import DynamicAlbumsControls from '$lib/components/dynamic-album-page/dynamic-albums-controls.svelte';
  import DynamicAlbums from '$lib/components/dynamic-album-page/dynamic-albums-list.svelte';
  import UserPageLayout from '$lib/components/layouts/user-page-layout.svelte';
  import EmptyPlaceholder from '$lib/components/shared-components/empty-placeholder.svelte';
  import { AppRoute } from '$lib/constants';
  import { createDynamicAlbumAndRedirect } from '$lib/utils/dynamic-album-utils';
  import { t } from 'svelte-i18n';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  let searchQuery = $state('');
</script>

<UserPageLayout title={data.meta.title} use={[[scrollMemory, { routeStartsWith: AppRoute.DYNAMIC_ALBUMS }]]}>
  {#snippet buttons()}
    <div class="flex place-items-center gap-2">
      <DynamicAlbumsControls bind:searchQuery />
    </div>
  {/snippet}

  <DynamicAlbums
    ownedDynamicAlbums={data.dynamicAlbums}
    sharedDynamicAlbums={data.sharedDynamicAlbums}
    allowEdit={true}
    {searchQuery}
  >
    {#snippet empty()}
      <EmptyPlaceholder text={$t('no_dynamic_albums_message')} onClick={() => createDynamicAlbumAndRedirect()} />
    {/snippet}
  </DynamicAlbums>
</UserPageLayout>
