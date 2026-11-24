import { type BlobRef, blobPath } from '@repo/contracts';
import { pluginAssetPath } from '@repo/contracts/plugins/assets';
import type {
  MediaAsset,
  MediaUrl,
} from '@repo/kit/primitives/content/media-url';
import { createContext, useContext, useMemo } from 'react';
import { ChannelMedia } from '../channel/channel-media';
import { serverHttpUrl } from './create-trpc-client';

// `watch` is there when the URL arrives later; it tells the readers of this one Blob, and no others, to ask again.
export interface BlobUrl {
  (blob: BlobRef): string;
  watch?: (blob: BlobRef, changed: () => void) => () => void;
}

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

export interface ServerUrls {
  blobUrl: BlobUrl;
  mediaUrl: MediaUrl;
}

// A paired Server has no URL for a Blob or an asset, so its images come out of its channel instead and read as empty until they have arrived (ADR-0045).
export function useChannelUrls(read: typeof fetch): ServerUrls {
  const media = useMemo(() => new ChannelMedia(read), [read]);

  // Stable, so an arriving image does not hand every reader new functions; each reader watches its own path.
  return useMemo(
    () => ({
      blobUrl: Object.assign(
        (blob: BlobRef) => media.urlFor(blobPath(blob.blobId)),
        {
          watch: (blob: BlobRef, changed: () => void) =>
            media.watch(blobPath(blob.blobId), changed),
        },
      ),
      mediaUrl: Object.assign(
        (asset: MediaAsset) => media.urlFor(pluginAssetPath(asset)),
        {
          watch: (asset: MediaAsset, changed: () => void) =>
            media.watch(pluginAssetPath(asset), changed),
        },
      ),
    }),
    [media],
  );
}
