<script lang="ts">
  import Icon from '$lib/components/elements/icon.svelte';
  import Combobox, { type ComboBoxOption } from '$lib/components/shared-components/combobox.svelte';
  import { getAllTags, type TagResponseDto } from '@immich/sdk';
  import { mdiClose } from '@mdi/js';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';
  import { SvelteSet } from 'svelte/reactivity';

  interface Props {
    selectedTagIds: SvelteSet<string>;
    label?: string;
    placeholder?: string;
    showLabel?: boolean;
    forceFocus?: boolean;
  }

  let { 
    selectedTagIds = $bindable(), 
    label = $t('tags'),
    placeholder = $t('search_tags'),
    showLabel = true,
    forceFocus = false
  }: Props = $props();

  let allTags: TagResponseDto[] = $state([]);
  let tagMap = $derived(Object.fromEntries(allTags.map((tag) => [tag.id, tag])));

  onMount(async () => {
    allTags = await getAllTags();
  });

  const handleSelect = (option?: ComboBoxOption) => {
    if (!option || !option.id) {
      return;
    }

    selectedTagIds.add(option.value);
  };

  const handleRemove = (tagId: string) => {
    selectedTagIds.delete(tagId);
  };
</script>

<div class="my-4 flex flex-col gap-2">
  <Combobox
    onSelect={handleSelect}
    label={showLabel ? label : ''}
    hideLabel={!showLabel}
    defaultFirstOption
    {forceFocus}
    options={allTags.map((tag) => ({ id: tag.id, label: tag.value, value: tag.id }))}
    {placeholder}
  />
</div>

<!-- Selected Tags Display -->
{#if selectedTagIds.size > 0}
  <section class="flex flex-wrap pt-2 gap-1">
    {#each selectedTagIds as tagId (tagId)}
      {@const tag = tagMap[tagId]}
      {#if tag}
        <div class="flex group transition-all">
          <span
            class="inline-block h-min whitespace-nowrap ps-3 pe-1 group-hover:ps-3 py-1 text-center align-baseline leading-none text-gray-100 dark:text-immich-dark-gray bg-primary rounded-s-full hover:bg-immich-primary/80 dark:hover:bg-immich-dark-primary/80 transition-all"
          >
            <p class="text-sm">
              {tag.value}
            </p>
          </span>

          <button
            type="button"
            class="text-gray-100 dark:text-immich-dark-gray bg-immich-primary/95 dark:bg-immich-dark-primary/95 rounded-e-full place-items-center place-content-center pe-2 ps-1 py-1 hover:bg-immich-primary/80 dark:hover:bg-immich-dark-primary/80 transition-all"
            title={$t('remove_tag')}
            onclick={() => handleRemove(tagId)}
          >
            <Icon path={mdiClose} />
          </button>
        </div>
      {/if}
    {/each}
  </section>
{/if}

{#if selectedTagIds.size === 0}
  <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
    {$t('select_tags_for_dynamic_album')}
  </p>
{/if} 