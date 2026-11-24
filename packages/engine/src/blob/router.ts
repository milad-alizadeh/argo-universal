import {
  BlobTextInput,
  BlobTextOutput,
  BlobUploadInput,
  BlobUploadOutput,
} from '@repo/contracts';
import { publicProcedure, router, routerFactory } from '../rpc';
import { type BlobUploadDeps, readBlobText, uploadBlob } from './blob';

export const createBlobRouter = routerFactory((deps: BlobUploadDeps) =>
  router({
    upload: publicProcedure
      .input(BlobUploadInput)
      .output(BlobUploadOutput)
      .mutation(({ input }): Promise<BlobUploadOutput> =>
        uploadBlob(deps, input),
      ),
    text: publicProcedure
      .input(BlobTextInput)
      .output(BlobTextOutput)
      .query(({ input }): Promise<BlobTextOutput> => readBlobText(deps, input)),
  }),
);
