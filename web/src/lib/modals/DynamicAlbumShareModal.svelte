<script lang="ts">
  import Dropdown from '$lib/components/elements/dropdown.svelte';
  import Icon from '$lib/components/elements/icon.svelte';
  import { AppRoute } from '$lib/constants';
  import QrCodeModal from '$lib/modals/QrCodeModal.svelte';
  import { makeSharedLinkUrl } from '$lib/utils';
  import {
    DynamicAlbumUserRole,
    getAllSharedLinks,
    searchUsers,
    type DynamicAlbumResponseDto,
    type DynamicAlbumShareDto,
    type SharedLinkResponseDto,
    type UserResponseDto,
  } from '@immich/sdk';
  import { Button, Link, Modal, ModalBody, Stack, Text } from '@immich/ui';
  import { mdiCheck, mdiEye, mdiLink, mdiPencil } from '@mdi/js';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';
  import UserAvatar from '../components/shared-components/user-avatar.svelte';

  interface Props {
    album: DynamicAlbumResponseDto;
    onClose: (result?: { action: 'sharedLink' } | { action: 'sharedUsers'; data: DynamicAlbumShareDto[] }) => void;
  }

  let { album, onClose }: Props = $props();

  let users: UserResponseDto[] = $state([]);
  let selectedUsers: Record<string, { user: UserResponseDto; role: DynamicAlbumUserRole }> = $state({});

  let sharedLinkUrl = $state('');
  const handleViewQrCode = (sharedLink: SharedLinkResponseDto) => {
    sharedLinkUrl = makeSharedLinkUrl(sharedLink.key);
  };

  const roleOptions: Array<{ title: string; value: DynamicAlbumUserRole | 'none'; icon?: string }> = [
    { title: $t('role_editor'), value: DynamicAlbumUserRole.Editor, icon: mdiPencil },
    { title: $t('role_viewer'), value: DynamicAlbumUserRole.Viewer, icon: mdiEye },
    { title: $t('remove_user'), value: 'none' },
  ];

  let sharedLinks: SharedLinkResponseDto[] = $state([]);
  onMount(async () => {
    sharedLinks = await getAllSharedLinks({ dynamicAlbumId: album.id });
    const data = await searchUsers();

    // remove album owner
    users = data.filter((user) => user.id !== album.ownerId);

    // Remove the existed shared users from the album
    for (const sharedUser of album.sharedUsers) {
      users = users.filter((user) => user.id !== sharedUser.userId);
    }
  });

  const handleToggle = (user: UserResponseDto) => {
    if (Object.keys(selectedUsers).includes(user.id)) {
      delete selectedUsers[user.id];
    } else {
      selectedUsers[user.id] = { user, role: DynamicAlbumUserRole.Editor };
    }
  };

  const handleChangeRole = (user: UserResponseDto, role: DynamicAlbumUserRole | 'none') => {
    if (role === 'none') {
      delete selectedUsers[user.id];
    } else {
      selectedUsers[user.id].role = role;
    }
  };
</script>

{#if sharedLinkUrl}
  <QrCodeModal title={$t('view_link')} onClose={() => (sharedLinkUrl = '')} value={sharedLinkUrl} />
{:else}
  <Modal title={$t('share_dynamic_album')} size="medium" {onClose}>
    <ModalBody>
      <Stack gap={6}>
        <!-- User Sharing Section -->
        <div>
          <Text class="mb-4">{$t('share_with_users')}</Text>
          <div class="space-y-2">
            {#each users as user (user.id)}
              <div class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <div class="flex items-center gap-3">
                  <UserAvatar {user} size="md" />
                  <div>
                    <div class="font-medium">{user.name}</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  {#if Object.keys(selectedUsers).includes(user.id)}
                    <Dropdown
                      options={roleOptions}
                      value={selectedUsers[user.id].role}
                      onSelect={(option) => handleChangeRole(user, option.value)}
                    >
                      <Button variant="ghost" size="small">
                        <Icon path={roleOptions.find((r) => r.value === selectedUsers[user.id].role)?.icon} />
                        {$t(roleOptions.find((r) => r.value === selectedUsers[user.id].role)?.title || '')}
                      </Button>
                    </Dropdown>
                    <Button
                      variant="ghost"
                      size="small"
                      onclick={() => handleToggle(user)}
                      class="text-green-600 dark:text-green-400"
                    >
                      <Icon path={mdiCheck} />
                    </Button>
                  {:else}
                    <Button variant="ghost" size="small" onclick={() => handleToggle(user)}>
                      {$t('add')}
                    </Button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
          {#if Object.keys(selectedUsers).length > 0}
            <Button
              class="mt-4"
              onclick={() =>
                onClose({
                  action: 'sharedUsers',
                  data: Object.values(selectedUsers).map(({ user, role }) => ({ userId: user.id, role })),
                })}
            >
              {$t('share')}
            </Button>
          {/if}
        </div>

        <!-- Shared Links Section -->
        <Stack gap={6}>
          {#if sharedLinks.length > 0}
            <div class="flex justify-between items-center">
              <Text>{$t('shared_links')}</Text>
              <Link href={AppRoute.SHARED_LINKS} onclick={() => onClose()} class="text-sm">{$t('view_all')}</Link>
            </div>

            <Stack gap={4}>
              {#each sharedLinks as sharedLink (sharedLink.id)}
                <div
                  class="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div>
                    <div class="font-medium">{sharedLink.description || $t('shared_link')}</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                      {$t('created')}: {new Date(sharedLink.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <Button variant="ghost" size="small" onclick={() => handleViewQrCode(sharedLink)}>
                      <Icon path={mdiLink} />
                      {$t('view_link')}
                    </Button>
                  </div>
                </div>
              {/each}
            </Stack>
          {/if}

          <Button
            leadingIcon={mdiLink}
            size="small"
            shape="round"
            fullWidth
            onclick={() => onClose({ action: 'sharedLink' })}>{$t('create_link')}</Button
          >
        </Stack>
      </Stack>
    </ModalBody>
  </Modal>
{/if}
