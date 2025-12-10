<script lang="ts">
  import { Icon } from '@immich/ui';
  import { mdiImage, mdiVideo } from '@mdi/js';
  import { t } from 'svelte-i18n';

  interface Props {
    assetType?: 'IMAGE' | 'VIDEO';
    onAssetTypeChange?: (assetType: 'IMAGE' | 'VIDEO' | undefined) => void;
    label?: string;
  }

  let { assetType = $bindable(), onAssetTypeChange, label }: Props = $props();

  function toggleAssetType(type: 'IMAGE' | 'VIDEO') {
    if (assetType === type) {
      assetType = undefined;
    } else {
      assetType = type;
    }
    onAssetTypeChange?.(assetType);
  }

  function clearAssetType() {
    assetType = undefined;
    onAssetTypeChange?.(assetType);
  }
</script>

<div class="flex flex-col gap-2">
  <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
    {label || $t('asset_type')}
  </p>

  <div class="flex gap-2">
    <button
      type="button"
      class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all {assetType ===
      'IMAGE'
        ? 'bg-immich-primary text-white border-immich-primary'
        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}"
      onclick={() => toggleAssetType('IMAGE')}
    >
      <Icon icon={mdiImage} size="20" />
      <span class="font-medium">{$t('photos')}</span>
    </button>

    <button
      type="button"
      class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all {assetType ===
      'VIDEO'
        ? 'bg-immich-primary text-white border-immich-primary'
        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}"
      onclick={() => toggleAssetType('VIDEO')}
    >
      <Icon icon={mdiVideo} size="20" />
      <span class="font-medium">{$t('videos')}</span>
    </button>
  </div>

  {#if assetType}
    <button
      type="button"
      class="text-sm text-gray-600 dark:text-gray-400 hover:underline self-start"
      onclick={clearAssetType}
    >
      {$t('show_all_types')}
    </button>
  {/if}
</div>
