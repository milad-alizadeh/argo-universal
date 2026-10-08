import { BlobUploadInput, BlobUploadOutput } from '@repo/contracts';
import { publicProcedure, router } from '../../engine/trpc';

export const blobRouter = router({
  upload: publicProcedure
    .input(BlobUploadInput)
    .output(BlobUploadOutput)
    .mutation(({ ctx, input }): Promise<BlobUploadOutput> =>
      ctx.services.blob.upload(input),
    ),
});
