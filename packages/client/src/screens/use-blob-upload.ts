import { type UseMutationResult, useMutation } from '@tanstack/react-query';
import type { inferOutput } from '@trpc/tanstack-react-query';
import { useTRPC } from '../trpc/context';

type UploadedImage = inferOutput<ReturnType<typeof useTRPC>['blob']['upload']>;
type ImageUpload = UseMutationResult<UploadedImage[], Error, FormData[]>;

// Uploads a set of files at once, as one mutation, so the caller sees them succeed or fail together.
export function useBlobUpload(): ImageUpload {
  const trpc = useTRPC();
  const upload = trpc.blob.upload.mutationOptions().mutationFn;
  return useMutation({
    mutationFn: (forms: FormData[], context) => {
      if (!upload) throw new Error('Blob upload mutation function is missing');
      return Promise.all(forms.map((form) => upload(form, context)));
    },
  });
}
