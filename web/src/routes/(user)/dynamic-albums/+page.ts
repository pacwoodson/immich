import { authenticate } from '$lib/utils/auth';
import { getFormatter } from '$lib/utils/i18n';
import * as sdk from '@immich/sdk';
import type { PageLoad } from './$types';

export const load = (async ({ url, fetch }) => {
  await authenticate(url);

  // Set SDK fetch for SvelteKit compatibility
  const originalFetch = sdk.defaults.fetch;
  sdk.defaults.fetch = fetch;

  try {
    const [dynamicAlbums, sharedDynamicAlbums] = await Promise.all([
      sdk.getAllDynamicAlbums(),
      sdk.getSharedDynamicAlbums(),
    ]);

    const $t = await getFormatter();

    return {
      dynamicAlbums,
      sharedDynamicAlbums,
      meta: {
        title: $t('dynamic_albums'),
      },
    };
  } finally {
    // Restore original fetch
    sdk.defaults.fetch = originalFetch;
  }
}) satisfies PageLoad;
