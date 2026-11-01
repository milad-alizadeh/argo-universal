export type { Connection, ConnectionState } from './stores/connection';

export { holdCacheOnline } from './stores/cache-online';

export {
  useConnectionState,
  useResubscribeOnReconnect,
} from './hooks/use-connection-state';

export { ConnectionContext, useConnection } from './stores/connection-context';

export { type OpenConnection, openConnection } from './api/open-connection';

export {
  isPaired,
  type PairedEndpoint,
  type ServerEndpoint,
} from './api/server-endpoint';

export { retryServer } from './api/retry-server';

// The connect step passes this as `browse`; null where the platform cannot browse.
export { browseServers } from './discovery/browse-servers';

export {
  type BrowseServers,
  type KnownServer,
  resolveServer,
  type ServerAddress,
  ServerNotFoundError,
  type ServerLocation,
} from './discovery/resolve-server';

export {
  BlobUrlContext,
  createServerBlobUrl,
  createServerMediaUrl,
  useBlobUrl,
  useChannelUrls,
} from './api/trpc/blob-url';

export {
  type ClientError,
  type ServerMutation,
  type TRPC,
  TRPCProvider,
  useTRPC,
  useTRPCClient,
} from './api/trpc/context';

export { formatServerClock, formatServerStart } from './components/server-time';

export { ConnectionBanner } from './components/connection-banner/connection-banner';
