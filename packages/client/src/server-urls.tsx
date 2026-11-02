import { MediaUrlContext } from '@repo/kit/primitives/content/media-url';
import type * as React from 'react';
import { type ReactNode, useMemo } from 'react';
import type { OpenConnection } from '#features/connection';
import {
  BlobUrlContext,
  createServerBlobUrl,
  createServerMediaUrl,
  useChannelUrls,
} from '#features/connection';
import type { AppServer } from '#features/servers';
import { LinkPreviewProvider } from './link-preview-provider';

export interface ServerUrlsProps {
  server: AppServer;
  // Present for a paired Server, whose Blobs and assets are read inside its channel.
  read: OpenConnection['fetch'];
  children: ReactNode;
}

// Images and Plugin media: over HTTP from the loopback routes of the Server on this Device, and out of the channel for a paired Server.
export function ServerUrls({
  server,
  read,
  children,
}: ServerUrlsProps): React.JSX.Element {
  return read ? (
    <ChannelServerUrls read={read}>{children}</ChannelServerUrls>
  ) : (
    <LoopbackServerUrls serverUrl={server.url}>{children}</LoopbackServerUrls>
  );
}

function ChannelServerUrls({
  read,
  children,
}: {
  read: typeof fetch;
  children: ReactNode;
}): React.JSX.Element {
  const { blobUrl, mediaUrl } = useChannelUrls(read);

  return (
    <UrlProviders blobUrl={blobUrl} mediaUrl={mediaUrl}>
      {children}
    </UrlProviders>
  );
}

function useLoopbackUrls(serverUrl: string | undefined): ServerUrlFns {
  if (serverUrl === undefined)
    throw new Error('A Server with no URL needs a channel');

  return useMemo(
    () => ({
      blobUrl: createServerBlobUrl(serverUrl),
      mediaUrl: createServerMediaUrl(serverUrl),
    }),
    [serverUrl],
  );
}

function LoopbackServerUrls({
  serverUrl,
  children,
}: {
  serverUrl: string | undefined;
  children: ReactNode;
}): React.JSX.Element {
  const { blobUrl, mediaUrl } = useLoopbackUrls(serverUrl);

  return (
    <UrlProviders blobUrl={blobUrl} mediaUrl={mediaUrl}>
      {children}
    </UrlProviders>
  );
}

function UrlProviders({
  blobUrl,
  mediaUrl,
  children,
}: ServerUrlFns & { children: ReactNode }): React.JSX.Element {
  return (
    <BlobUrlContext.Provider value={blobUrl}>
      <MediaUrlContext.Provider value={mediaUrl}>
        <LinkPreviewProvider>{children}</LinkPreviewProvider>
      </MediaUrlContext.Provider>
    </BlobUrlContext.Provider>
  );
}

interface ServerUrlFns {
  blobUrl: ReturnType<typeof createServerBlobUrl>;
  mediaUrl: ReturnType<typeof createServerMediaUrl>;
}
