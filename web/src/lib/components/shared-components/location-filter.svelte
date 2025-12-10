<script lang="ts">
  import { Field, Input } from '@immich/ui';
  import { t } from 'svelte-i18n';

  interface LocationFilterType {
    city?: string;
    state?: string;
    country?: string;
  }

  interface Props {
    location: string | LocationFilterType | undefined;
    onLocationChange?: (location: string | LocationFilterType | undefined) => void;
    label?: string;
  }

  let { location = $bindable(), onLocationChange, label }: Props = $props();

  let mode = $state<'text' | 'structured'>(
    typeof location === 'object' && location !== null ? 'structured' : 'text',
  );

  let textLocation = $state(typeof location === 'string' ? location : '');
  let city = $state(typeof location === 'object' && location?.city ? location.city : '');
  let state = $state(typeof location === 'object' && location?.state ? location.state : '');
  let country = $state(typeof location === 'object' && location?.country ? location.country : '');

  function toggleMode() {
    mode = mode === 'text' ? 'structured' : 'text';
    if (mode === 'text') {
      textLocation = '';
      location = '';
    } else {
      city = '';
      state = '';
      country = '';
      location = {};
    }
    onLocationChange?.(location);
  }

  function handleTextChange(event: Event) {
    const target = event.target as HTMLInputElement;
    textLocation = target.value;
    location = textLocation || undefined;
    onLocationChange?.(location);
  }

  function handleStructuredChange() {
    const hasValues = city || state || country;
    location = hasValues ? { city: city || undefined, state: state || undefined, country: country || undefined } : undefined;
    onLocationChange?.(location);
  }

  function clearLocation() {
    if (mode === 'text') {
      textLocation = '';
      location = undefined;
    } else {
      city = '';
      state = '';
      country = '';
      location = undefined;
    }
    onLocationChange?.(location);
  }
</script>

<div class="flex flex-col gap-3">
  <div class="flex items-center justify-between">
    <p class="immich-form-label">{label || $t('location')}</p>
    <button
      type="button"
      class="text-sm text-immich-primary dark:text-immich-dark-primary hover:underline"
      onclick={toggleMode}
    >
      {mode === 'text' ? $t('use_structured') : $t('use_text_search')}
    </button>
  </div>

  {#if mode === 'text'}
    <Field label={$t('location_search')}>
      <Input
        type="text"
        bind:value={textLocation}
        onchange={handleTextChange}
        placeholder={$t('enter_location')}
      />
    </Field>
  {:else}
    <div class="grid grid-cols-1 gap-3">
      <Field label={$t('city')}>
        <Input type="text" bind:value={city} onchange={handleStructuredChange} placeholder={$t('enter_city')} />
      </Field>

      <Field label={$t('state')}>
        <Input type="text" bind:value={state} onchange={handleStructuredChange} placeholder={$t('enter_state')} />
      </Field>

      <Field label={$t('country')}>
        <Input
          type="text"
          bind:value={country}
          onchange={handleStructuredChange}
          placeholder={$t('enter_country')}
        />
      </Field>
    </div>
  {/if}

  {#if (mode === 'text' && textLocation) || (mode === 'structured' && (city || state || country))}
    <button
      type="button"
      class="text-sm text-gray-600 dark:text-gray-400 hover:underline self-start"
      onclick={clearLocation}
    >
      {$t('clear')}
    </button>
  {/if}
</div>
