import { type BlobUploadDeps, uploadBlob } from '../blob';
import { routerFactory } from '../rpc';
import { readGitHub } from './github-access';
import { readPreviewUrl } from './read-url';
import { createLinkPreviewRouter } from './router';

export const createServerLinkPreviewRouter = routerFactory(
  (deps: BlobUploadDeps) =>
    createLinkPreviewRouter({
      read: readPreviewUrl,
      github: readGitHub,
      storeImage: (image) => uploadBlob(deps, image),
    }),
);
