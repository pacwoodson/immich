<script lang="ts">
  import { getAllTags, type TagResponseDto } from '@immich/sdk';
  import { Icon } from '@immich/ui';
  import { mdiClose } from '@mdi/js';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';
  import { SvelteSet } from 'svelte/reactivity';
  import Combobox, { type ComboBoxOption } from './combobox.svelte';

  interface Props {
    selectedTagIds: SvelteSet<string>;
    onTagsChange?: (tags: SvelteSet<string>) => void;
    label?: string;
    placeholder?: string;
  }

  let { selectedTagIds = $bindable(), onTagsChange, label, placeholder }: Props = $props();

  let allTags: TagResponseDto[] = $state([]);
  let tagMap = $derived(Object.fromEntries(allTags.map((tag) => [tag.id, tag])));

  onMount(async () => {
    allTags = await getAllTags();
  });

  const handleSelect = async (option?: ComboBoxOption) => {
    if (!option || !option.value) {
      return;
    }

    selectedTagIds.add(option.value);
    onTagsChange?.(selectedTagIds);
  };

  const handleRemove = (tagId: string) => {
    selectedTagIds.delete(tagId);
    onTagsChange?.(selectedTagIds);
  };
</script>

<div class="flex flex-col gap-2">
  <Combobox
    onSelect={handleSelect}
    label={label || $t('tags')}
    allowCreate={false}
    defaultFirstOption
    options={allTags
      .filter((tag) => !selectedTagIds.has(tag.id))
      .map((tag) => ({ id: tag.id, label: tag.value, value: tag.id }))}
    placeholder={placeholder || $t('search_tags')}
  />

  {#if selectedTagIds.size > 0}
    <section class="flex flex-wrap gap-1">
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
              <Icon icon={mdiClose} size="16" />
            </button>
          </div>
        {/if}
      {/each}
    </section>
  {/if}
</div>
