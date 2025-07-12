<script lang="ts">
  import Icon from '$lib/components/elements/icon.svelte';
  import ButtonContextMenu from '$lib/components/shared-components/context-menu/button-context-menu.svelte';
  import MenuOption from '$lib/components/shared-components/context-menu/menu-option.svelte';
  import SettingSwitch from '$lib/components/shared-components/settings/setting-switch.svelte';
  import UserAvatar from '$lib/components/shared-components/user-avatar.svelte';
  import Combobox, { type ComboBoxOption } from '$lib/components/shared-components/combobox.svelte';
  import { modalManager } from '$lib/managers/modal-manager.svelte';
  import { handleError } from '$lib/utils/handle-error';
  import {
    DynamicAlbumUserRole,
    AssetOrder,
    removeDynamicAlbumShare,
    updateDynamicAlbumInfo,
    updateDynamicAlbumShare,
    getAllTags,
    type DynamicAlbumResponseDto,
    type UserResponseDto,
    type TagResponseDto,
  } from '@immich/sdk';
  import { Modal, ModalBody, Button, HStack } from '@immich/ui';
  import { mdiArrowDownThin, mdiArrowUpThin, mdiDotsVertical, mdiPlus, mdiClose, mdiPencil } from '@mdi/js';
  import { findKey } from 'lodash-es';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';
  import { SvelteSet } from 'svelte/reactivity';
  import type { RenderedOption } from '../components/elements/dropdown.svelte';
  import { notificationController, NotificationType } from '../components/shared-components/notification/notification';
  import SettingDropdown from '../components/shared-components/settings/setting-dropdown.svelte';

  interface Props {
    album: DynamicAlbumResponseDto;
    order: AssetOrder | undefined;
    user: UserResponseDto;
    onClose: (
      result?: { action: 'changeOrder'; order: AssetOrder } | { action: 'shareUser' } | { action: 'refreshAlbum' } | { action: 'editFilters' },
    ) => void;
  }

  let { album = $bindable(), order, user, onClose }: Props = $props();

  const options: Record<AssetOrder, RenderedOption> = {
    [AssetOrder.Asc]: { icon: mdiArrowUpThin, title: $t('oldest_first') },
    [AssetOrder.Desc]: { icon: mdiArrowDownThin, title: $t('newest_first') },
  };

  let selectedOption = $derived(order ? options[order] : options[AssetOrder.Desc]);

  // Filter editing state
  let isEditingFilters = $state(false);
  let allTags: TagResponseDto[] = $state([]);
  let tagMap = $derived(Object.fromEntries(allTags.map((tag) => [tag.id, tag])));
  let selectedTagIds = new SvelteSet<string>();
  let isSubmitting = $state(false);

  onMount(async () => {
    allTags = await getAllTags();

    // Pre-populate selected tags from existing filters
    for (const filter of album.filters) {
      if (filter.type === 'tag' && filter.value && typeof filter.value === 'object' && 'tagIds' in filter.value) {
        const tagIds = filter.value.tagIds as string[];
        for (const tagId of tagIds) {
          selectedTagIds.add(tagId);
        }
      }
    }
  });

  const handleToggleOrder = async (returnedOption: RenderedOption): Promise<void> => {
    if (selectedOption === returnedOption) {
      return;
    }
    let order: AssetOrder = AssetOrder.Desc;
    order = findKey(options, (option) => option === returnedOption) as AssetOrder;

    try {
      await updateDynamicAlbumInfo({
        id: album.id,
        updateDynamicAlbumDto: {
          order,
        },
      });
      onClose({ action: 'changeOrder', order });
    } catch (error) {
      handleError(error, $t('errors.unable_to_save_album'));
    }
  };

  const handleToggleActivity = async () => {
    try {
      album = await updateDynamicAlbumInfo({
        id: album.id,
        updateDynamicAlbumDto: {
          isActivityEnabled: !album.isActivityEnabled,
        },
      });

      notificationController.show({
        type: NotificationType.Info,
        message: $t('activity_changed', { values: { enabled: album.isActivityEnabled } }),
      });
    } catch (error) {
      handleError(error, $t('errors.cant_change_activity', { values: { enabled: album.isActivityEnabled } }));
    }
  };

  const handleRemoveUser = async (user: UserResponseDto): Promise<void> => {
    const confirmed = await modalManager.showDialog({
      title: $t('album_remove_user'),
      prompt: $t('album_remove_user_confirmation', { values: { user: user.name } }),
      confirmText: $t('remove_user'),
    });

    if (!confirmed) {
      return;
    }

    try {
      await removeDynamicAlbumShare({ id: album.id, userId: user.id });
      onClose({ action: 'refreshAlbum' });
      notificationController.show({
        type: NotificationType.Info,
        message: $t('album_user_removed', { values: { user: user.name } }),
      });
    } catch (error) {
      handleError(error, $t('errors.unable_to_remove_album_users'));
    }
  };

  const handleUpdateSharedUserRole = async (user: UserResponseDto, role: DynamicAlbumUserRole) => {
    try {
      await updateDynamicAlbumShare({ id: album.id, userId: user.id, updateDynamicAlbumShareDto: { role } });
      const message = $t('user_role_set', {
        values: { user: user.name, role: role == DynamicAlbumUserRole.Viewer ? $t('role_viewer') : $t('role_editor') },
      });
      onClose({ action: 'refreshAlbum' });
      notificationController.show({ type: NotificationType.Info, message });
    } catch (error) {
      handleError(error, $t('errors.unable_to_change_album_user_role'));
    }
  };

  // Filter editing functions
  const handleSelect = (option?: ComboBoxOption) => {
    if (!option || !option.id) {
      return;
    }

    selectedTagIds.add(option.value);
  };

  const handleRemove = (tagId: string) => {
    selectedTagIds.delete(tagId);
  };

  const handleSaveFilters = async () => {
    if (selectedTagIds.size === 0) {
      return;
    }

    isSubmitting = true;
    try {
      const updatedAlbum = await updateDynamicAlbumInfo({
        id: album.id,
        updateDynamicAlbumDto: {
          filters: [
            {
              type: 'tag',
              value: {
                tagIds: [...selectedTagIds],
                operator: 'and',
              },
            },
          ],
        },
      });

      notificationController.show({
        message: $t('dynamic_album_filters_updated', { values: { album: updatedAlbum.name } }),
        type: NotificationType.Info,
      });

      // Update the bound album object
      album.filters = updatedAlbum.filters;
      album.updatedAt = updatedAlbum.updatedAt;

      isEditingFilters = false;
      onClose({ action: 'editFilters' });
    } catch (error) {
      handleError(error, $t('errors.failed_to_update_dynamic_album'));
    } finally {
      isSubmitting = false;
    }
  };

  const handleCancelEditFilters = () => {
    isEditingFilters = false;
    // Reset selected tags to original state
    selectedTagIds.clear();
    for (const filter of album.filters) {
      if (filter.type === 'tag' && filter.value && typeof filter.value === 'object' && 'tagIds' in filter.value) {
        const tagIds = filter.value.tagIds as string[];
        for (const tagId of tagIds) {
          selectedTagIds.add(tagId);
        }
      }
    }
  };
</script>

<Modal title={$t('options')} onClose={() => onClose({ action: 'refreshAlbum' })} size="medium">
  <ModalBody>
    <div class="items-center justify-center">
      <!-- Settings Section -->
      <div class="py-2">
        <h2 class="text-gray text-sm mb-2">{$t('settings').toUpperCase()}</h2>
        <div class="grid p-2 gap-y-2">
          {#if order}
            <SettingDropdown
              title={$t('display_order')}
              options={Object.values(options)}
              selectedOption={options[order]}
              onToggle={handleToggleOrder}
            />
          {/if}
          <SettingSwitch
            title={$t('comments_and_likes')}
            subtitle={$t('let_others_respond')}
            checked={album.isActivityEnabled}
            onToggle={handleToggleActivity}
          />
        </div>
      </div>

      <!-- Filters Section -->
      <div class="py-2">
        <div class="text-gray text-sm mb-3 flex items-center justify-between">
          <span>{$t('filters').toUpperCase()}</span>
          {#if !isEditingFilters}
            <Button
              size="small"
              color="secondary"
              onclick={() => (isEditingFilters = true)}
              class="flex items-center gap-1"
            >
                              <Icon path={mdiPencil} size="16" />
              {$t('edit')}
            </Button>
          {/if}
        </div>
        <div class="p-2">
          {#if isEditingFilters}
            <!-- Filter Editing Mode -->
            <div class="space-y-4">
              <div class="flex flex-col gap-2">
                <Combobox
                  onSelect={handleSelect}
                  label={$t('tags')}
                  defaultFirstOption
                  options={allTags.map((tag) => ({ id: tag.id, label: tag.value, value: tag.id }))}
                  placeholder={$t('search_tags')}
                />
              </div>

              <!-- Selected Tags Display -->
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
                          <Icon path={mdiClose} />
                        </button>
                      </div>
                    {/if}
                  {/each}
                </section>
              {/if}

              {#if selectedTagIds.size === 0}
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {$t('select_tags_for_dynamic_album')}
                </p>
              {/if}

              <!-- Filter Edit Actions -->
              <div class="flex gap-2 pt-2">
                <Button size="small" color="secondary" onclick={handleCancelEditFilters}>
                  {$t('cancel')}
                </Button>
                <Button
                  size="small"
                  disabled={isSubmitting || selectedTagIds.size === 0}
                  onclick={handleSaveFilters}
                >
                  {$t('save')}
                </Button>
              </div>
            </div>
          {:else}
            <!-- Filter Display Mode -->
            {#if album.filters.length > 0}
              <div class="space-y-2">
                {#each album.filters as filter, index}
                  <div class="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                    <div
                      class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 text-xs font-medium"
                    >
                      {index + 1}
                    </div>

                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        {$t(`filter_type_${filter.type}`)}
                      </div>
                      
                      <div class="text-xs text-gray-500 dark:text-gray-400">
                        {#if filter.value && typeof filter.value === 'object'}
                          <!-- Tag Filter -->
                          {#if filter.type === 'tag' && filter.value.tagIds}
                            <div class="flex items-center gap-2">
                              <span class="font-medium">{$t(filter.value.operator === 'and' ? 'operator_and' : 'operator_or')}:</span>
                              <span>{filter.value.tagIds.length} {$t('tags')}</span>
                            </div>
                            {#if filter.value.tagIds.length > 0}
                              <div class="text-xs text-gray-400 dark:text-gray-500">
                                {filter.value.tagIds.slice(0, 3).map(tagId => tagMap[tagId]?.value || tagId).join(', ')}{filter.value.tagIds.length > 3 ? '...' : ''}
                              </div>
                            {/if}
                          {/if}

                          <!-- Person Filter -->
                          {#if filter.type === 'person' && filter.value.personIds}
                            <div class="flex items-center gap-2">
                              <span class="font-medium">{$t(filter.value.operator === 'and' ? 'operator_and' : 'operator_or')}:</span>
                              <span>{filter.value.personIds.length} {$t('people')}</span>
                            </div>
                          {/if}

                          <!-- Location Filter -->
                          {#if filter.type === 'location'}
                            <div class="space-y-1">
                              {#if filter.value.cities && filter.value.cities.length > 0}
                                <div class="flex items-center gap-2">
                                  <span class="font-medium">{$t('cities')}:</span>
                                  <span>{filter.value.cities.length} {$t('cities')}</span>
                                </div>
                              {/if}
                              {#if filter.value.countries && filter.value.countries.length > 0}
                                <div class="flex items-center gap-2">
                                  <span class="font-medium">{$t('countries')}:</span>
                                  <span>{filter.value.countries.length} {$t('countries')}</span>
                                </div>
                              {/if}
                              {#if filter.value.states && filter.value.states.length > 0}
                                <div class="flex items-center gap-2">
                                  <span class="font-medium">{$t('states')}:</span>
                                  <span>{filter.value.states.length} {$t('states')}</span>
                                </div>
                              {/if}
                            </div>
                          {/if}

                          <!-- Date Range Filter -->
                          {#if filter.type === 'date_range'}
                            <div class="space-y-1">
                              {#if filter.value.startDate && filter.value.endDate}
                                <div class="flex items-center gap-2">
                                  <span class="font-medium">{$t('date_range')}:</span>
                                  <span>{new Date(filter.value.startDate).toLocaleDateString()} - {new Date(filter.value.endDate).toLocaleDateString()}</span>
                                </div>
                              {:else if filter.value.startDate}
                                <div class="flex items-center gap-2">
                                  <span class="font-medium">From:</span>
                                  <span>{new Date(filter.value.startDate).toLocaleDateString()}</span>
                                </div>
                              {:else if filter.value.endDate}
                                <div class="flex items-center gap-2">
                                  <span class="font-medium">Until:</span>
                                  <span>{new Date(filter.value.endDate).toLocaleDateString()}</span>
                                </div>
                              {/if}
                            </div>
                          {/if}

                          <!-- Asset Type Filter -->
                          {#if filter.type === 'asset_type'}
                            <div class="space-y-1">
                              {#if filter.value.types && filter.value.types.length > 0}
                                <div class="flex items-center gap-2">
                                  <span class="font-medium">{$t('asset_types')}:</span>
                                  <span>{filter.value.types.map(type => $t(type === 'image' ? 'images' : 'videos')).join(', ')}</span>
                                </div>
                              {/if}
                              {#if filter.value.favorites !== null && filter.value.favorites !== undefined}
                                <div class="flex items-center gap-2">
                                  <span class="font-medium">{$t('favorites')}:</span>
                                  <span>{filter.value.favorites ? $t('yes') : $t('no')}</span>
                                </div>
                              {/if}
                            </div>
                          {/if}
                        {:else}
                          <div class="text-xs text-gray-400 dark:text-gray-500">
                            {JSON.stringify(filter.value)}
                          </div>
                        {/if}
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {$t('no_filters_configured')}
              </p>
            {/if}
          {/if}
        </div>
      </div>

      <!-- People Section -->
      <div class="py-2">
        <div class="text-gray text-sm mb-3">{$t('people').toUpperCase()}</div>
        <div class="p-2">
          <button type="button" class="flex items-center gap-2" onclick={() => onClose({ action: 'shareUser' })}>
            <div class="rounded-full w-10 h-10 border border-gray-500 flex items-center justify-center">
              <div><Icon path={mdiPlus} size="25" /></div>
            </div>
            <div>{$t('invite_people')}</div>
          </button>

          <div class="flex items-center gap-2 py-2 mt-2">
            <div>
              <UserAvatar {user} size="md" />
            </div>
            <div class="w-full">{user.name}</div>
            <div>{$t('owner')}</div>
          </div>

          {#each album.sharedUsers as sharedUser (sharedUser.userId)}
            <div class="flex items-center gap-2 py-2">
              <div>
                <UserAvatar
                  user={{
                    id: sharedUser.userId,
                    name: $t(sharedUser.role === 'editor' ? 'role_editor' : 'role_viewer'),
                    email: '',
                    profileImagePath: '',
                    avatarColor: '',
                    profileChangedAt: new Date(),
                  }}
                  size="md"
                />
              </div>
              <div class="w-full">{$t(sharedUser.role === 'editor' ? 'role_editor' : 'role_viewer')}</div>
              <ButtonContextMenu icon={mdiDotsVertical} size="medium" title={$t('options')}>
                {#if sharedUser.role === DynamicAlbumUserRole.Viewer}
                  <MenuOption
                    onClick={() => handleUpdateSharedUserRole({ id: sharedUser.userId, name: $t('role_viewer'), email: '', profileImagePath: '', avatarColor: '', profileChangedAt: new Date() }, DynamicAlbumUserRole.Editor)}
                    text={$t('allow_edits')}
                  />
                {:else}
                  <MenuOption
                    onClick={() => handleUpdateSharedUserRole({ id: sharedUser.userId, name: $t('role_editor'), email: '', profileImagePath: '', avatarColor: '', profileChangedAt: new Date() }, DynamicAlbumUserRole.Viewer)}
                    text={$t('disallow_edits')}
                  />
                {/if}
                <MenuOption 
                  onClick={() => handleRemoveUser({ id: sharedUser.userId, name: $t(sharedUser.role === 'editor' ? 'role_editor' : 'role_viewer'), email: '', profileImagePath: '', avatarColor: '', profileChangedAt: new Date() })} 
                  text={$t('remove')} 
                />
              </ButtonContextMenu>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </ModalBody>
</Modal> 