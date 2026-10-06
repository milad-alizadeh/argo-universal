import type { BlobRef } from '@repo/contracts';
import { createContext, useContext } from 'react';
import { serverHttpUrl } from './create-trpc-client';

export type BlobUrl = (blob: BlobRef) => string;

export const BlobUrlContext = createContext<BlobUrl | null>(null);

// Where an image the Server stores is fetched: its `/blobs/:id` route, or a story's mock.
export function useBlobUrl() {
  const blobUrl = useContext(BlobUrlContext);
  if (!blobUrl) throw new Error('useBlobUrl needs AppProviders');
  return blobUrl;
}

// The Server serves blobs over HTTP beside tRPC, on its WebSocket address.
export function serverBlobUrl(serverUrl: string): BlobUrl {
  return (blob) => serverHttpUrl(serverUrl, `/blobs/${blob.blobId}`);
}
