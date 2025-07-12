<script lang="ts">
  import Dropdown from '$lib/components/elements/dropdown.svelte';
  import Icon from '$lib/components/elements/icon.svelte';
  import {
    notificationController,
    NotificationType,
  } from '$lib/components/shared-components/notification/notification';
  import UserAvatar from '$lib/components/shared-components/user-avatar.svelte';
  import { handleError } from '$lib/utils/handle-error';
  import { searchUsers, shareDynamicAlbum, type DynamicAlbumResponseDto, type UserResponseDto } from '@immich/sdk';
  import { Button, Modal, ModalBody, Text } from '@immich/ui';
  import { mdiCheck, mdiEye, mdiPencil, mdiShareVariantOutline } from '@mdi/js';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';

  interface Props {
    album: DynamicAlbumResponseDto;
    onClose: (result?: { action: 'sharedUsers'; data: ShareData[] }) => void;
  }

  interface ShareData {
    userId: string;
    role: 'editor' | 'viewer';
  }

  let { album, onClose }: Props = $props();

  let users: UserResponseDto[] = $state([]);
  let selectedUsers: Record<string, { user: UserResponseDto; role: 'editor' | 'viewer' }> = $state({});

  const roleOptions: Array<{ title: string; value: 'editor' | 'viewer' | 'none'; icon?: string }> = [
    { title: $t('role_editor'), value: 'editor', icon: mdiPencil },
    { title: $t('role_viewer'), value: 'viewer', icon: mdiEye },
    { title: $t('remove_user'), value: 'none' },
  ];

  onMount(async () => {
    const data = await searchUsers();

    // Remove album owner from the list
    users = data.filter((user) => user.id !== album.ownerId);

    // Remove already shared users from the album
    for (const sharedUser of album.sharedUsers || []) {
      users = users.filter((user) => user.id !== sharedUser.userId);
    }
  });

  const handleToggle = (user: UserResponseDto) => {
    if (Object.keys(selectedUsers).includes(user.id)) {
      delete selectedUsers[user.id];
    } else {
      selectedUsers[user.id] = { user, role: 'editor' };
    }
  };

  const handleChangeRole = (user: UserResponseDto, role: 'editor' | 'viewer' | 'none') => {
    if (role === 'none') {
      delete selectedUsers[user.id];
    } else {
      selectedUsers[user.id].role = role;
    }
  };

  const handleShare = async () => {
    if (Object.keys(selectedUsers).length === 0) {
      return;
    }

    try {
      const shareData: ShareData[] = Object.values(selectedUsers).map(({ user, role }) => ({
        userId: user.id,
        role,
      }));

      // Share with each user individually since the API only supports one user at a time
      for (const { userId, role } of shareData) {
        await shareDynamicAlbum({
          id: album.id,
          shareDynamicAlbumDto: {
            userId,
            role,
          },
        });
      }

      notificationController.show({
        message: $t('dynamic_album_shared_successfully'),
        type: NotificationType.Info,
      });

      onClose({ action: 'sharedUsers', data: shareData });
    } catch (error) {
      handleError(error, $t('errors.failed_to_share_dynamic_album'));
    }
  };
</script>

<Modal size="small" title={$t('share_dynamic_album')} icon={mdiShareVariantOutline} {onClose}>
  <ModalBody>
    {#if Object.keys(selectedUsers).length > 0}
      <div class="mb-2 py-2 sticky">
        <p class="text-xs font-medium">{$t('selected')}</p>
        <div class="my-2">
          {#each Object.values(selectedUsers) as { user } (user.id)}
            <div class="flex place-items-center gap-4 p-4">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-full border bg-green-600 text-3xl text-white"
              >
                <Icon path={mdiCheck} size={24} />
              </div>

              <div class="text-start grow">
                <p class="text-immich-fg dark:text-immich-dark-fg">
                  {user.name}
                </p>
                <p class="text-xs">
                  {user.email}
                </p>
              </div>

              <Dropdown
                title={$t('role')}
                options={roleOptions}
                render={({ title, icon }) => ({ title, icon })}
                onSelect={({ value }) => handleChangeRole(user, value)}
              />
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if users.length + Object.keys(selectedUsers).length === 0}
      <p class="p-5 text-sm">
        {$t('dynamic_album_share_no_users')}
      </p>
    {/if}

    <div class="immich-scrollbar max-h-[500px] overflow-y-auto">
      {#if users.length > 0 && users.length !== Object.keys(selectedUsers).length}
        <Text>{$t('users')}</Text>

        <div class="my-2">
          {#each users as user (user.id)}
            {#if !Object.keys(selectedUsers).includes(user.id)}
              <div class="flex place-items-center transition-all hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl">
                <button
                  type="button"
                  onclick={() => handleToggle(user)}
                  class="flex w-full place-items-center gap-4 p-4"
                >
                  <UserAvatar {user} size="md" />
                  <div class="text-start grow">
                    <p class="text-immich-fg dark:text-immich-dark-fg">
                      {user.name}
                    </p>
                    <p class="text-xs">
                      {user.email}
                    </p>
                  </div>
                </button>
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    </div>

    {#if users.length > 0}
      <div class="py-3">
        <Button
          size="small"
          fullWidth
          shape="round"
          disabled={Object.keys(selectedUsers).length === 0}
          onclick={handleShare}
        >
          {$t('share')}
        </Button>
      </div>
    {/if}
  </ModalBody>
</Modal>
