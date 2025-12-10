import { DynamicAlbumRepository } from 'src/repositories/dynamic-album.repository';
import { Mocked, vitest } from 'vitest';

export const newDynamicAlbumRepositoryMock = (): Mocked<DynamicAlbumRepository> => {
  return {
    getAssets: vitest.fn(),
    getMetadata: vitest.fn(),
    getThumbnailAssetId: vitest.fn(),
    isAssetInDynamicAlbum: vitest.fn(),
  } as unknown as Mocked<DynamicAlbumRepository>;
};
