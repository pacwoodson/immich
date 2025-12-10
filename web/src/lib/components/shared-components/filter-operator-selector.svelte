<script lang="ts">
  import { t } from 'svelte-i18n';

  interface Props {
    operator: 'and' | 'or';
    onOperatorChange?: (operator: 'and' | 'or') => void;
    label?: string;
  }

  let { operator = $bindable(), onOperatorChange, label }: Props = $props();

  function handleOperatorChange(newOperator: 'and' | 'or') {
    operator = newOperator;
    onOperatorChange?.(operator);
  }
</script>

<div class="flex flex-col gap-2">
  <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
    {label || $t('filter_operator')}
  </p>

  <div class="flex gap-2">
    <button
      type="button"
      class="flex-1 px-4 py-2 rounded-lg border transition-all {operator === 'or'
        ? 'bg-immich-primary text-white border-immich-primary'
        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}"
      onclick={() => handleOperatorChange('or')}
    >
      <div class="flex flex-col items-center">
        <span class="font-semibold">{$t('any_or')}</span>
        <span class="text-xs opacity-80">{$t('match_any_filter')}</span>
      </div>
    </button>

    <button
      type="button"
      class="flex-1 px-4 py-2 rounded-lg border transition-all {operator === 'and'
        ? 'bg-immich-primary text-white border-immich-primary'
        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}"
      onclick={() => handleOperatorChange('and')}
    >
      <div class="flex flex-col items-center">
        <span class="font-semibold">{$t('all_and')}</span>
        <span class="text-xs opacity-80">{$t('match_all_filters')}</span>
      </div>
    </button>
  </div>

  <p class="text-xs text-gray-500 dark:text-gray-400">
    {#if operator === 'or'}
      {$t('assets_matching_any_filter_shown')}
    {:else}
      {$t('assets_matching_all_filters_shown')}
    {/if}
  </p>
</div>
