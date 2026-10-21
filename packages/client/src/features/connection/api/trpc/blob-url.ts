import { type BlobRef, blobPath } from '@repo/contracts';
import { pluginAssetPath } from '@repo/contracts/plugins/assets';
import type { MediaUrl } from '@repo/kit/primitives/content/media-url';
import { createContext, useContext } from 'react';
import { serverHttpUrl } from './create-trpc-client';

export type BlobUrl = (blob: BlobRef) => string;

export const BlobUrlContext = createContext<BlobUrl | null>(null);

// Where an image the Server stores is fetched: its `/blobs/:id` route, or a story's mock.
export function useBlobUrl(): BlobUrl {
  const blobUrl = useContext(BlobUrlContext);

  if (!blobUrl) throw new Error('useBlobUrl needs AppProviders');

  return blobUrl;
}

// The Server serves blobs over HTTP beside tRPC, on its WebSocket address.
export function createServerBlobUrl(serverUrl: string): BlobUrl {
  return (blob) => serverHttpUrl(serverUrl, blobPath(blob.blobId));
}

// A Plugin's video or audio streams from the Server's asset route, never from the Plugin's host.
export function createServerMediaUrl(serverUrl: string): MediaUrl {
  return (asset) => serverHttpUrl(serverUrl, pluginAssetPath(asset));
}
