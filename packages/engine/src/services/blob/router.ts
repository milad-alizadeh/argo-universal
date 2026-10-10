import { BlobUploadInput, BlobUploadOutput } from '@repo/contracts';
import { publicProcedure, routerFactory } from '../../rpc';
import { type BlobUploadDeps, uploadBlob } from './blob';

export const createBlobRouter = routerFactory((blobUpload: BlobUploadDeps) => ({
  upload: publicProcedure
    .input(BlobUploadInput)
    .output(BlobUploadOutput)
    .mutation(({ input }): Promise<BlobUploadOutput> =>
      uploadBlob(blobUpload, input),
    ),
}));
