import { blobPath } from '@repo/contracts';
import { queryOptions, type UseQueryOptions } from '@tanstack/react-query';

// Reads a Blob's text the way images read theirs: its `/blobs/:id` route, over the channel for a paired Server.
export type BlobTextReader = (blobId: string) => Promise<string>;

export const createBlobTextReader =
  (
    read: (path: string, init?: RequestInit) => Promise<Response>,
  ): BlobTextReader =>
  async (blobId) => {
    const response = await read(blobPath(blobId));

    if (!response.ok) throw new Error(`The Server answered ${response.status}`);

    return new TextDecoder().decode(await response.arrayBuffer());
  };

// A Blob is named by the hash of its content, so what a read brought never goes stale.
export const blobTextQuery = (
  read: BlobTextReader,
  blobId: string,
): UseQueryOptions<string, Error, string, string[]> =>
  queryOptions({
    queryKey: ['blobText', blobId],
    queryFn: () => read(blobId),
    staleTime: Infinity,
    retry: false,
  });
