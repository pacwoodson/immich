<script lang="ts">
  import MenuOption from '$lib/components/shared-components/context-menu/menu-option.svelte';
  import {
    notificationController,
    NotificationType,
  } from '$lib/components/shared-components/notification/notification';
  import { handleError } from '$lib/utils/handle-error';
  import { setDynamicAlbumThumbnail, updateAlbumInfo, type AlbumResponseDto, type AssetResponseDto } from '@immich/sdk';
  import { mdiImageOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';

  interface Props {
    asset: AssetResponseDto;
    album: AlbumResponseDto;
  }

  let { asset, album }: Props = $props();

  const handleUpdateThumbnail = async () => {
    try {
      if (album.dynamic) {
        // For dynamic albums, use the new endpoint
        await setDynamicAlbumThumbnail({
          id: album.id,
          assetId: asset.id,
        });
      } else {
        // For regular albums, use the existing method
        await updateAlbumInfo({
          id: album.id,
          updateAlbumDto: {
            albumThumbnailAssetId: asset.id,
          },
        });
      }

      notificationController.show({
        type: NotificationType.Info,
        message: $t('album_cover_updated'),
        timeout: 1500,
      });
    } catch (error) {
      handleError(error, $t('errors.unable_to_update_album_cover'));
    }
  };
</script>

<MenuOption text={$t('set_as_album_cover')} icon={mdiImageOutline} onClick={handleUpdateThumbnail} />
