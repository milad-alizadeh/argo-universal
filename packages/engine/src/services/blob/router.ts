import { BlobUploadInput, BlobUploadOutput } from '@repo/contracts';
import { publicProcedure, router, routerFactory } from '../../rpc';
import { type BlobUploadDeps, uploadBlob } from './blob';

export const createBlobRouter = routerFactory((deps: BlobUploadDeps) =>
  router({
    upload: publicProcedure
      .input(BlobUploadInput)
      .output(BlobUploadOutput)
      .mutation(({ input }): Promise<BlobUploadOutput> =>
        uploadBlob(deps, input),
      ),
  }),
);
