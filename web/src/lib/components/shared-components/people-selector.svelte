<script lang="ts">
  import ImageThumbnail from '$lib/components/assets/thumbnail/image-thumbnail.svelte';
  import { getPeopleThumbnailUrl } from '$lib/utils';
  import { handleError } from '$lib/utils/handle-error';
  import { getAllPeople, type PersonResponseDto } from '@immich/sdk';
  import { Icon, LoadingSpinner } from '@immich/ui';
  import { mdiCheckCircle } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import type { SvelteSet } from 'svelte/reactivity';

  interface Props {
    selectedPeopleIds: SvelteSet<string>;
    onPeopleChange?: (people: SvelteSet<string>) => void;
    label?: string;
  }

  let { selectedPeopleIds = $bindable(), onPeopleChange, label }: Props = $props();

  let peoplePromise = getPeople();
  let searchName = $state('');

  async function getPeople() {
    try {
      const res = await getAllPeople({ withHidden: false });
      return res.people;
    } catch (error) {
      handleError(error, $t('errors.failed_to_get_people'));
      return [];
    }
  }

  function togglePersonSelection(id: string) {
    if (selectedPeopleIds.has(id)) {
      selectedPeopleIds.delete(id);
    } else {
      selectedPeopleIds.add(id);
    }
    onPeopleChange?.(selectedPeopleIds);
  }

  const filterPeople = (list: PersonResponseDto[], name: string) => {
    const nameLower = name.toLowerCase();
    return name ? list.filter((p) => p.name.toLowerCase().includes(nameLower)) : list;
  };
</script>

<div class="flex flex-col gap-2">
  <p class="immich-form-label">
    {label || $t('people')}
    {#if selectedPeopleIds.size > 0}
      <span class="text-sm text-gray-600 dark:text-gray-400">
        ({selectedPeopleIds.size} {$t('selected')})
      </span>
    {/if}
  </p>

  {#await peoplePromise}
    <div class="flex h-32 items-center justify-center">
      <LoadingSpinner size="large" />
    </div>
  {:then people}
    {#if people && people.length > 0}
      {@const filteredPeople = filterPeople(people, searchName)}

      <input
        type="text"
        bind:value={searchName}
        placeholder={$t('filter_people')}
        class="immich-form-input mb-2"
      />

      <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-64 overflow-y-auto immich-scrollbar">
        {#each filteredPeople as person (person.id)}
          {@const isSelected = selectedPeopleIds.has(person.id)}
          <button
            type="button"
            class="relative flex flex-col items-center rounded-xl border-2 hover:bg-subtle dark:hover:bg-immich-dark-primary/20 p-2 transition-all
            {isSelected
              ? 'dark:border-immich-dark-primary border-immich-primary bg-gray-100 dark:bg-gray-800'
              : 'border-transparent'}"
            onclick={() => togglePersonSelection(person.id)}
          >
            <ImageThumbnail
              circle
              shadow
              url={getPeopleThumbnailUrl(person)}
              altText={person.name}
              widthStyle="100%"
            />
            <p class="mt-1 text-xs font-medium text-ellipsis line-clamp-2 w-full text-center px-1">
              {person.name}
            </p>
            {#if isSelected}
              <div class="absolute top-1 right-1 text-immich-primary dark:text-immich-dark-primary">
                <Icon icon={mdiCheckCircle} size="20" />
              </div>
            {/if}
          </button>
        {/each}
      </div>
    {:else}
      <p class="text-sm text-gray-500 dark:text-gray-400">{$t('no_people_found')}</p>
    {/if}
  {/await}
</div>
