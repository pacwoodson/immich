import { authenticate } from '$lib/utils/auth';
import { getAllDynamicAlbums, getSharedDynamicAlbums } from '$lib/utils/dynamic-album-api';
import { getFormatter } from '$lib/utils/i18n';
import type { PageLoad } from './$types';

export const load = (async ({ url }) => {
  await authenticate(url);

  const [dynamicAlbums, sharedDynamicAlbums] = await Promise.all([getAllDynamicAlbums(), getSharedDynamicAlbums()]);

  const $t = await getFormatter();

  return {
    dynamicAlbums,
    sharedDynamicAlbums,
    meta: {
      title: $t('dynamic_albums'),
    },
  };
}) satisfies PageLoad;
