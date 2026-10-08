import type { BlobRef } from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';
import { useTRPCClient } from './context';

// Uploads a set of files at once, as one mutation, so the caller sees them succeed or fail together.
export function useBlobUpload(): ReturnType<
  typeof useMutation<BlobRef[], Error, FormData[]>
> {
  const client = useTRPCClient();
  return useMutation({
    mutationFn: (forms: FormData[]) =>
      Promise.all(forms.map((form) => client.blob.upload.mutate(form))),
  });
}
