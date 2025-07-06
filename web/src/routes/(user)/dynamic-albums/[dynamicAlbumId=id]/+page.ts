import { authenticate } from '$lib/utils/auth';
import { getDynamicAlbum, getDynamicAlbumAssetCount, getDynamicAlbumAssets } from '$lib/utils/dynamic-album-api';
import { getFormatter } from '$lib/utils/i18n';
import type { PageLoad } from './$types';

export const load = (async ({ url, params }) => {
  await authenticate(url);

  const { dynamicAlbumId } = params;

  const [dynamicAlbum, assets, assetCount] = await Promise.all([
    getDynamicAlbum(dynamicAlbumId),
    getDynamicAlbumAssets(dynamicAlbumId, { skip: 0, take: 50 }),
    getDynamicAlbumAssetCount(dynamicAlbumId),
  ]);

  const $t = await getFormatter();

  return {
    dynamicAlbum,
    assets,
    assetCount,
    meta: {
      title: dynamicAlbum.name,
    },
  };
}) satisfies PageLoad;
