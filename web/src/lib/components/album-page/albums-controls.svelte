<script lang="ts">
  import Dropdown from '$lib/elements/Dropdown.svelte';
  import GroupTab from '$lib/elements/GroupTab.svelte';
  import SearchBar from '$lib/elements/SearchBar.svelte';
  import DynamicAlbumFiltersModal from '$lib/modals/DynamicAlbumFiltersModal.svelte';
  import {
    AlbumFilter,
    AlbumGroupBy,
    AlbumSortBy,
    AlbumViewMode,
    albumViewSettings,
    SortOrder,
  } from '$lib/stores/preferences.store';
  import { modalManager } from '@immich/ui';
  import {
    type AlbumGroupOptionMetadata,
    type AlbumSortOptionMetadata,
    collapseAllAlbumGroups,
    createAlbumAndRedirect,
    expandAllAlbumGroups,
    findFilterOption,
    findGroupOptionMetadata,
    findSortOptionMetadata,
    getSelectedAlbumGroupOption,
    groupOptionsMetadata,
    sortOptionsMetadata,
  } from '$lib/utils/album-utils';
  import { Button, Icon, IconButton, Text } from '@immich/ui';
  import {
    mdiArrowDownThin,
    mdiArrowUpThin,
    mdiChevronDown,
    mdiFilterOutline,
    mdiFolderArrowDownOutline,
    mdiFolderArrowUpOutline,
    mdiFolderRemoveOutline,
    mdiFormatListBulletedSquare,
    mdiFolderPlusOutline,
    mdiPlusBoxOutline,
    mdiUnfoldLessHorizontal,
    mdiUnfoldMoreHorizontal,
    mdiViewGridOutline,
  } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import { fly } from 'svelte/transition';

  interface Props {
    albumGroups: string[];
    searchQuery: string;
  }

  let { albumGroups, searchQuery = $bindable() }: Props = $props();

  const flipOrdering = (ordering: string) => {
    return ordering === SortOrder.Asc ? SortOrder.Desc : SortOrder.Asc;
  };

  const handleChangeAlbumFilter = (filter: string, defaultFilter: AlbumFilter) => {
    $albumViewSettings.filter =
      Object.keys(albumFilterNames).find((key) => albumFilterNames[key as AlbumFilter] === filter) ?? defaultFilter;
  };

  const handleChangeGroupBy = ({ id, defaultOrder }: AlbumGroupOptionMetadata) => {
    if ($albumViewSettings.groupBy === id) {
      $albumViewSettings.groupOrder = flipOrdering($albumViewSettings.groupOrder);
    } else {
      $albumViewSettings.groupBy = id;
      $albumViewSettings.groupOrder = defaultOrder;
    }
  };

  const handleChangeSortBy = ({ id, defaultOrder }: AlbumSortOptionMetadata) => {
    if ($albumViewSettings.sortBy === id) {
      $albumViewSettings.sortOrder = flipOrdering($albumViewSettings.sortOrder);
    } else {
      $albumViewSettings.sortBy = id;
      $albumViewSettings.sortOrder = defaultOrder;
    }
  };

  const handleChangeListMode = () => {
    $albumViewSettings.view =
      $albumViewSettings.view === AlbumViewMode.Cover ? AlbumViewMode.List : AlbumViewMode.Cover;
  };

  let groupIcon = $derived.by(() => {
    if (selectedGroupOption?.id === AlbumGroupBy.None) {
      return mdiFolderRemoveOutline;
    }
    return $albumViewSettings.groupOrder === SortOrder.Desc ? mdiFolderArrowDownOutline : mdiFolderArrowUpOutline;
  });

  let albumFilterNames: Record<AlbumFilter, string> = $derived({
    [AlbumFilter.All]: $t('all'),
    [AlbumFilter.Owned]: $t('owned'),
    [AlbumFilter.Shared]: $t('shared'),
  });

  let selectedFilterOption = $derived(albumFilterNames[findFilterOption($albumViewSettings.filter)]);
  let selectedSortOption = $derived(findSortOptionMetadata($albumViewSettings.sortBy));
  let selectedGroupOption = $derived(findGroupOptionMetadata($albumViewSettings.groupBy));
  let sortIcon = $derived($albumViewSettings.sortOrder === SortOrder.Desc ? mdiArrowDownThin : mdiArrowUpThin);

  let albumSortByNames: Record<AlbumSortBy, string> = $derived({
    [AlbumSortBy.Title]: $t('sort_title'),
    [AlbumSortBy.ItemCount]: $t('sort_items'),
    [AlbumSortBy.DateModified]: $t('sort_modified'),
    [AlbumSortBy.DateCreated]: $t('sort_created'),
    [AlbumSortBy.MostRecentPhoto]: $t('sort_recent'),
    [AlbumSortBy.OldestPhoto]: $t('sort_oldest'),
  });

  let albumGroupByNames: Record<AlbumGroupBy, string> = $derived({
    [AlbumGroupBy.None]: $t('group_no'),
    [AlbumGroupBy.Owner]: $t('group_owner'),
    [AlbumGroupBy.Year]: $t('group_year'),
  });

  const handleCreateDynamicAlbum = async () => {
    const album = await modalManager.show(DynamicAlbumFiltersModal, {});
    if (album) {
      window.location.href = `/albums/${album.id}`;
    }
  };

</script>

<!-- Filter Albums by Sharing Status (All, Owned, Shared) -->
<div class="hidden xl:block h-10">
  <GroupTab
    label={$t('show_albums')}
    filters={Object.values(albumFilterNames)}
    selected={selectedFilterOption}
    onSelect={(selected) => handleChangeAlbumFilter(selected, AlbumFilter.All)}
  />
</div>

<!-- Search Albums -->
<div class="hidden xl:block h-10 xl:w-60 2xl:w-80">
  <SearchBar placeholder={$t('search_albums')} bind:name={searchQuery} showLoadingSpinner={false} />
</div>

<!-- Create Album -->
<div class="relative group">
  <Button
    leadingIcon={mdiPlusBoxOutline}
    trailingIcon={mdiChevronDown}
    size="small"
    variant="ghost"
    color="secondary"
    onclick={() => createAlbumAndRedirect()}
  >
    <p class="hidden md:block">{$t('create_album')}</p>
  </Button>

  <div
    class="absolute right-0 top-full mt-1 z-10 hidden group-hover:block bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-48"
  >
    <button
      type="button"
      class="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg transition-colors"
      onclick={() => createAlbumAndRedirect()}
    >
      <Icon icon={mdiFolderPlusOutline} size="18" />
      <span class="text-sm">{$t('create_album')}</span>
    </button>
    <button
      type="button"
      class="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg transition-colors"
      onclick={handleCreateDynamicAlbum}
    >
      <Icon icon={mdiFilterOutline} size="18" />
      <span class="text-sm">{$t('create_dynamic_album')}</span>
    </button>
  </div>
</div>

<!-- Sort Albums -->
<Dropdown
  title={$t('sort_albums_by')}
  options={Object.values(sortOptionsMetadata)}
  selectedOption={selectedSortOption}
  onSelect={handleChangeSortBy}
  render={({ id }) => ({
    title: albumSortByNames[id],
    icon: sortIcon,
  })}
/>

<!-- Group Albums -->
<Dropdown
  title={$t('group_albums_by')}
  options={Object.values(groupOptionsMetadata)}
  selectedOption={selectedGroupOption}
  onSelect={handleChangeGroupBy}
  render={({ id, isDisabled }) => ({
    title: albumGroupByNames[id],
    icon: groupIcon,
    disabled: isDisabled(),
  })}
/>

{#if getSelectedAlbumGroupOption($albumViewSettings) !== AlbumGroupBy.None}
  <span in:fly={{ x: -50, duration: 250 }}>
    <!-- Expand Album Groups -->
    <div class="hidden xl:flex gap-0">
      <div class="block">
        <IconButton
          title={$t('expand_all')}
          onclick={() => expandAllAlbumGroups()}
          variant="ghost"
          color="secondary"
          shape="round"
          icon={mdiUnfoldMoreHorizontal}
          aria-label={$t('expand_all')}
        />
      </div>

      <!-- Collapse Album Groups -->
      <div class="block">
        <IconButton
          title={$t('collapse_all')}
          onclick={() => collapseAllAlbumGroups(albumGroups)}
          variant="ghost"
          color="secondary"
          shape="round"
          icon={mdiUnfoldLessHorizontal}
          aria-label={$t('collapse_all')}
        />
      </div>
    </div>
  </span>
{/if}

<!-- Cover/List Display Toggle -->
{#if $albumViewSettings.view === AlbumViewMode.List}
  <Button
    leadingIcon={mdiViewGridOutline}
    onclick={() => handleChangeListMode()}
    size="small"
    variant="ghost"
    color="secondary"
  >
    <Text class="hidden md:block">{$t('covers')}</Text>
  </Button>
{:else}
  <Button
    leadingIcon={mdiFormatListBulletedSquare}
    onclick={() => handleChangeListMode()}
    size="small"
    variant="ghost"
    color="secondary"
  >
    <Text class="hidden md:block">{$t('list')}</Text>
  </Button>
{/if}
