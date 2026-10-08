import { BlobUploadInput, BlobUploadOutput } from '@repo/contracts';
import { publicProcedure, router } from '../trpc';

export const blobRouter = router({
  upload: publicProcedure
    .input(BlobUploadInput)
    .output(BlobUploadOutput)
    .mutation(
      ({
        ctx,
        input,
      }): Promise<{
        blobId: string;
        mime: string;
        bytes: number;
        width?: number;
        height?: number;
      }> => ctx.services.blob.upload(input),
    ),
});
