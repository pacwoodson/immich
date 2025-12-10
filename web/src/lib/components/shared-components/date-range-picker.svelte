<script lang="ts">
  import { Field, Input } from '@immich/ui';
  import { t } from 'svelte-i18n';

  interface Props {
    startDate?: Date;
    endDate?: Date;
    onDateRangeChange?: (start: Date, end: Date) => void;
    label?: string;
  }

  let { startDate = $bindable(), endDate = $bindable(), onDateRangeChange, label }: Props = $props();

  let startDateStr = $state(startDate ? formatDate(startDate) : '');
  let endDateStr = $state(endDate ? formatDate(endDate) : '');

  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function handleStartDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.value) {
      const date = new Date(target.value);
      startDate = date;
      startDateStr = target.value;
      if (startDate && endDate) {
        onDateRangeChange?.(startDate, endDate);
      }
    }
  }

  function handleEndDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.value) {
      const date = new Date(target.value);
      endDate = date;
      endDateStr = target.value;
      if (startDate && endDate) {
        onDateRangeChange?.(startDate, endDate);
      }
    }
  }

  function setQuickRange(days: number) {
    endDate = new Date();
    startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDateStr = formatDate(startDate);
    endDateStr = formatDate(endDate);
    onDateRangeChange?.(startDate, endDate);
  }

  function clearRange() {
    startDate = undefined;
    endDate = undefined;
    startDateStr = '';
    endDateStr = '';
  }
</script>

<div class="flex flex-col gap-3">
  <p class="immich-form-label">{label || $t('date_range')}</p>

  <div class="grid grid-cols-2 gap-4">
    <Field label={$t('start_date')}>
      <Input type="date" value={startDateStr} onchange={handleStartDateChange} max={endDateStr} />
    </Field>

    <Field label={$t('end_date')}>
      <Input type="date" value={endDateStr} onchange={handleEndDateChange} min={startDateStr} />
    </Field>
  </div>

  <div class="flex flex-wrap gap-2">
    <button
      type="button"
      class="px-3 py-1 text-sm rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
      onclick={() => setQuickRange(7)}
    >
      {$t('last_week')}
    </button>
    <button
      type="button"
      class="px-3 py-1 text-sm rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
      onclick={() => setQuickRange(30)}
    >
      {$t('last_month')}
    </button>
    <button
      type="button"
      class="px-3 py-1 text-sm rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
      onclick={() => setQuickRange(365)}
    >
      {$t('last_year')}
    </button>
    {#if startDateStr || endDateStr}
      <button
        type="button"
        class="px-3 py-1 text-sm rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
        onclick={clearRange}
      >
        {$t('clear')}
      </button>
    {/if}
  </div>
</div>
