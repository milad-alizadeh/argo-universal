import { type UseMutationResult, useMutation } from '@tanstack/react-query';
import type { inferOutput } from '@trpc/tanstack-react-query';
import { useTRPC } from '../trpc/context';

type UploadedImage = inferOutput<ReturnType<typeof useTRPC>['blob']['upload']>;

// Uploads a set of files at once, as one mutation, so the caller sees them succeed or fail together.
export function useBlobUpload(): UseMutationResult<
  UploadedImage[],
  Error,
  FormData[]
> {
  const trpc = useTRPC();
  const upload = trpc.blob.upload.mutationOptions().mutationFn;
  return useMutation({
    mutationFn: (forms: FormData[], context) =>
      Promise.all(
        forms.map((form) => {
          if (!upload)
            throw new Error('Blob upload mutation function is missing');
          return upload(form, context);
        }),
      ),
  });
}
