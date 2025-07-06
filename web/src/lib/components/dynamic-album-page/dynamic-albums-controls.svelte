<script lang="ts">
  import SearchBar from '$lib/components/elements/search-bar.svelte';
  import { createDynamicAlbumAndRedirect } from '$lib/utils/dynamic-album-utils';
  import { Button } from '@immich/ui';
  import { mdiPlusBoxOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';

  interface Props {
    searchQuery: string;
  }

  let { searchQuery = $bindable() }: Props = $props();
</script>

<!-- Search Dynamic Albums -->
<div class="hidden xl:block h-10 xl:w-60 2xl:w-80">
  <SearchBar placeholder={$t('search_dynamic_albums')} bind:name={searchQuery} showLoadingSpinner={false} />
</div>

<!-- Create Dynamic Album -->
<Button
  leadingIcon={mdiPlusBoxOutline}
  onclick={() => createDynamicAlbumAndRedirect()}
  size="small"
  variant="ghost"
  color="secondary"
>
  <p class="hidden md:block">{$t('create_dynamic_album')}</p>
</Button>
