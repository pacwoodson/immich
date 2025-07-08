import { authenticate } from '$lib/utils/auth';
import { getAssetInfoFromParam } from '$lib/utils/navigation';
import { getDynamicAlbumInfo } from '@immich/sdk';
import type { PageLoad } from './$types';

export const load = (async ({ params, url }) => {
  await authenticate(url);
  const [dynamicAlbum, asset] = await Promise.all([
    getDynamicAlbumInfo({ id: params.dynamicAlbumId }),
    getAssetInfoFromParam(params),
  ]);

  return {
    dynamicAlbum,
    asset,
    meta: {
      title: dynamicAlbum.name,
    },
  };
}) satisfies PageLoad;
