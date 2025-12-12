<script lang="ts">
  import { Icon } from '@immich/ui';
  import {
    mdiAccountMultiple,
    mdiCalendarRange,
    mdiCamera,
    mdiFilterOutline,
    mdiImage,
    mdiMapMarker,
    mdiStar,
    mdiTag,
    mdiVideo,
  } from '@mdi/js';
  import { t } from 'svelte-i18n';

  interface DynamicAlbumFilters {
    tags?: string[];
    people?: string[];
    location?: string | { city?: string; state?: string; country?: string };
    dateRange?: { start: Date | string; end: Date | string };
    assetType?: 'IMAGE' | 'VIDEO';
    metadata?: {
      isFavorite?: boolean;
      make?: string;
      model?: string;
      lensModel?: string;
      rating?: number;
    };
    operator?: 'and' | 'or';
  }

  interface Props {
    filters: DynamicAlbumFilters;
    onEdit?: () => void;
    tagNames?: Record<string, string>; // Map of tag ID to tag name
    peopleNames?: Record<string, string>; // Map of person ID to person name
    compact?: boolean;
  }

  let { filters, onEdit, tagNames = {}, peopleNames = {}, compact = false }: Props = $props();

  function formatDateRange(dateRange: { start: Date | string; end: Date | string }): string {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  }

  function formatLocation(location: string | { city?: string; state?: string; country?: string }): string {
    if (typeof location === 'string') {
      return location;
    }
    const parts = [location.city, location.state, location.country].filter(Boolean);
    return parts.join(', ');
  }

  const filterSections = $derived.by(() => {
    const sections: Array<{ icon: string; label: string; value: string }> = [];

    if (filters.tags && filters.tags.length > 0) {
      const tagLabels = filters.tags.map((id) => tagNames[id] || id);
      sections.push({
        icon: mdiTag,
        label: $t('tags'),
        value: tagLabels.join(', '),
      });
    }

    if (filters.people && filters.people.length > 0) {
      const peopleLabels = filters.people.map((id) => peopleNames[id] || id);
      sections.push({
        icon: mdiAccountMultiple,
        label: $t('people'),
        value: peopleLabels.join(', '),
      });
    }

    if (filters.location) {
      sections.push({
        icon: mdiMapMarker,
        label: $t('location'),
        value: formatLocation(filters.location),
      });
    }

    if (filters.dateRange) {
      sections.push({
        icon: mdiCalendarRange,
        label: $t('date_range'),
        value: formatDateRange(filters.dateRange),
      });
    }

    if (filters.assetType) {
      sections.push({
        icon: filters.assetType === 'IMAGE' ? mdiImage : mdiVideo,
        label: $t('type'),
        value: filters.assetType === 'IMAGE' ? $t('photos') : $t('videos'),
      });
    }

    if (filters.metadata) {
      const metaParts: string[] = [];
      if (filters.metadata.isFavorite !== undefined) {
        metaParts.push(filters.metadata.isFavorite ? $t('favorites_only') : $t('non_favorites'));
      }
      if (filters.metadata.rating) {
        metaParts.push(`${filters.metadata.rating} ${$t('stars')}`);
      }
      if (filters.metadata.make) {
        metaParts.push(filters.metadata.make);
      }
      if (filters.metadata.model) {
        metaParts.push(filters.metadata.model);
      }
      if (filters.metadata.lensModel) {
        metaParts.push(filters.metadata.lensModel);
      }

      if (metaParts.length > 0) {
        sections.push({
          icon: filters.metadata.isFavorite !== undefined ? mdiStar : mdiCamera,
          label: $t('metadata'),
          value: metaParts.join(' • '),
        });
      }
    }

    return sections;
  });
</script>

{#if filterSections.length > 0}
  <div
    class="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Icon icon={mdiFilterOutline} size="16" />
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {$t('dynamic_filters')}
          {#if filters.operator}
            <span class="text-xs text-gray-500 dark:text-gray-400">
              ({filters.operator === 'and' ? $t('all_and') : $t('any_or')})
            </span>
          {/if}
        </p>
      </div>
      {#if onEdit}
        <button
          type="button"
          class="text-xs text-immich-primary dark:text-immich-dark-primary hover:underline"
          onclick={onEdit}
        >
          {$t('edit')}
        </button>
      {/if}
    </div>

    {#if compact}
      <div class="flex flex-wrap gap-2">
        {#each filterSections as section}
          <div class="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs">
            <Icon icon={section.icon} size="14" />
            <span class="font-medium">{section.label}:</span>
            <span class="text-gray-600 dark:text-gray-400">{section.value}</span>
          </div>
        {/each}
      </div>
    {:else}
      <div class="flex flex-col gap-2">
        {#each filterSections as section}
          <div class="flex items-start gap-2">
            <Icon icon={section.icon} size="18" class="mt-0.5" />
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-gray-600 dark:text-gray-400">{section.label}</p>
              <p class="text-sm text-gray-900 dark:text-gray-100 break-words">{section.value}</p>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}
