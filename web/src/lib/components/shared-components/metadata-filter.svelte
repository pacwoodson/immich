<script lang="ts">
  import { Field, Icon, Input } from '@immich/ui';
  import { mdiStar, mdiStarOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';

  interface MetadataFilterType {
    isFavorite?: boolean;
    make?: string;
    model?: string;
    lensModel?: string;
    rating?: number;
  }

  interface Props {
    metadata: MetadataFilterType;
    onMetadataChange?: (metadata: MetadataFilterType) => void;
    label?: string;
  }

  let { metadata = $bindable(), onMetadataChange, label }: Props = $props();

  let isFavorite = $state(metadata.isFavorite);
  let make = $state(metadata.make || '');
  let model = $state(metadata.model || '');
  let lensModel = $state(metadata.lensModel || '');
  let rating = $state(metadata.rating);

  function handleChange() {
    const hasValues = isFavorite !== undefined || make || model || lensModel || rating !== undefined;
    metadata = hasValues
      ? {
          isFavorite: isFavorite !== undefined ? isFavorite : undefined,
          make: make || undefined,
          model: model || undefined,
          lensModel: lensModel || undefined,
          rating: rating !== undefined ? rating : undefined,
        }
      : {};
    onMetadataChange?.(metadata);
  }

  function toggleFavorite(value: boolean) {
    if (isFavorite === value) {
      isFavorite = undefined;
    } else {
      isFavorite = value;
    }
    handleChange();
  }

  function setRating(value: number) {
    if (rating === value) {
      rating = undefined;
    } else {
      rating = value;
    }
    handleChange();
  }

  function clearMetadata() {
    isFavorite = undefined;
    make = '';
    model = '';
    lensModel = '';
    rating = undefined;
    metadata = {};
    onMetadataChange?.(metadata);
  }
</script>

<div class="flex flex-col gap-3">
  <p class="immich-form-label">{label || $t('metadata_filters')}</p>

  <div class="flex flex-col gap-2">
    <p class="text-sm font-medium">{$t('favorites')}</p>
    <div class="flex gap-2">
      <button
        type="button"
        class="px-4 py-2 rounded-lg border {isFavorite === true
          ? 'bg-immich-primary text-white border-immich-primary'
          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}"
        onclick={() => toggleFavorite(true)}
      >
        {$t('favorites_only')}
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded-lg border {isFavorite === false
          ? 'bg-immich-primary text-white border-immich-primary'
          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}"
        onclick={() => toggleFavorite(false)}
      >
        {$t('non_favorites')}
      </button>
    </div>
  </div>

  <div class="flex flex-col gap-2">
    <p class="text-sm font-medium">{$t('rating')}</p>
    <div class="flex gap-1">
      {#each [1, 2, 3, 4, 5] as star}
        <button
          type="button"
          class="p-1 hover:scale-110 transition-transform"
          onclick={() => setRating(star)}
        >
          <Icon icon={rating && rating >= star ? mdiStar : mdiStarOutline} size="24" />
        </button>
      {/each}
    </div>
  </div>

  <Field label={$t('camera_make')}>
    <Input type="text" bind:value={make} onchange={handleChange} placeholder={$t('enter_camera_make')} />
  </Field>

  <Field label={$t('camera_model')}>
    <Input type="text" bind:value={model} onchange={handleChange} placeholder={$t('enter_camera_model')} />
  </Field>

  <Field label={$t('lens_model')}>
    <Input type="text" bind:value={lensModel} onchange={handleChange} placeholder={$t('enter_lens_model')} />
  </Field>

  {#if isFavorite !== undefined || make || model || lensModel || rating !== undefined}
    <button
      type="button"
      class="text-sm text-gray-600 dark:text-gray-400 hover:underline self-start"
      onclick={clearMetadata}
    >
      {$t('clear_all')}
    </button>
  {/if}
</div>
