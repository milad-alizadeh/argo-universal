import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import {
  ConnectionBanner,
  useConnection,
  useConnectionState,
  useTRPC,
} from '#features/connection';

// The App's Connection banner: the live state, the Server's name from its last system.info, and Try again.
export function LiveConnectionBanner(): React.JSX.Element | null {
  const connection = useConnection();
  const state = useConnectionState();
  const trpc = useTRPC();
  const info = useQuery(trpc.system.info.queryOptions());

  return (
    <ConnectionBanner
      state={state}
      serverName={info.data?.name}
      onRetry={() => connection.send({ type: 'connection.retry' })}
    />
  );
}
