import { authenticate } from '$lib/utils/auth';
import { getFormatter } from '$lib/utils/i18n';
import * as sdk from '@immich/sdk';
import type { PageLoad } from './$types';

export const load = (async ({ url, params, fetch }) => {
  await authenticate(url);

  const { dynamicAlbumId } = params;

  // Set SDK fetch for SvelteKit compatibility
  const originalFetch = sdk.defaults.fetch;
  sdk.defaults.fetch = fetch;

  try {
    const [dynamicAlbum, assets, assetCount] = await Promise.all([
      sdk.getDynamicAlbumInfo({ id: dynamicAlbumId }),
      sdk.getDynamicAlbumAssets({ id: dynamicAlbumId, skip: 0, take: 50 }),
      sdk.getDynamicAlbumAssetCount({ id: dynamicAlbumId }),
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
  } finally {
    // Restore original fetch
    sdk.defaults.fetch = originalFetch;
  }
}) satisfies PageLoad;
