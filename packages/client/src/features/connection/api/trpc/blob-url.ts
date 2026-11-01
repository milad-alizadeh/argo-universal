import { type BlobRef, blobPath } from '@repo/contracts';
import { pluginAssetPath } from '@repo/contracts/plugins/assets';
import type { MediaUrl } from '@repo/kit/primitives/content/media-url';
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { ChannelMedia } from '../channel/channel-media';
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

export interface ServerUrls {
  blobUrl: BlobUrl;
  mediaUrl: MediaUrl;
}

// A paired Server has no URL for a Blob or an asset, so its images come out of its channel instead and read as empty until they have arrived (ADR-0045).
export function useChannelUrls(read: typeof fetch): ServerUrls {
  const media = useMemo(() => new ChannelMedia(read), [read]);
  const version = useSyncExternalStore(media.subscribe, media.getVersion);

  // The version is why these are new functions once something has arrived, so the screens reading them draw again.
  return useMemo(
    () => ({
      blobUrl: (blob) => media.urlFor(blobPath(blob.blobId)),
      mediaUrl: (asset) => media.urlFor(pluginAssetPath(asset)),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the version is the point
    [media, version],
  );
}
