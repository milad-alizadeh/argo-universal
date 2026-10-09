import { BlobUploadInput, BlobUploadOutput } from '@repo/contracts';
import { publicProcedure, router } from '../../engine/trpc';
import { uploadBlob } from './blob';

export const blobRouter = router({
  upload: publicProcedure
    .input(BlobUploadInput)
    .output(BlobUploadOutput)
    .mutation(({ ctx, input }): Promise<BlobUploadOutput> =>
      uploadBlob(ctx, input),
    ),
});
