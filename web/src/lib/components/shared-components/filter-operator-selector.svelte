<script lang="ts">
  import SettingDropdown from '$lib/components/shared-components/settings/setting-dropdown.svelte';
  import { mdiArrowUpThin, mdiArrowDownThin } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import type { RenderedOption } from '../elements/dropdown.svelte';

  interface Props {
    selectedOperator: 'and' | 'or';
    onOperatorChange: (operator: 'and' | 'or') => void;
  }

  let { selectedOperator = $bindable(), onOperatorChange }: Props = $props();

  // Operator options for the dropdown
  const operatorOptions: Record<'and' | 'or', RenderedOption> = {
    and: { icon: mdiArrowUpThin, title: $t('operator_and') },
    or: { icon: mdiArrowDownThin, title: $t('operator_or') },
  };
</script>

<div class="flex flex-col gap-2">
  <SettingDropdown
    title={$t('filter_operator')}
    subtitle={$t('filter_operator_description')}
    options={Object.values(operatorOptions)}
    selectedOption={operatorOptions[selectedOperator]}
    onToggle={(option) => {
      const newOperator = Object.keys(operatorOptions).find(key => operatorOptions[key as 'and' | 'or'] === option) as 'and' | 'or';
      if (newOperator) {
        onOperatorChange(newOperator);
      }
    }}
  />
</div> 