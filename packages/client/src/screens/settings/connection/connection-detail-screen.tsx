import { useQuery } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import type * as React from 'react';
import { useConnectionState, useTRPC } from '#features/connection';
import { ConnectionDetailView } from './connection-detail-view';
import { toServerDetails } from './to-server-details';
import { useKeepRunning } from './use-keep-running';

export function ConnectionDetailScreen(): React.JSX.Element {
  const trpc = useTRPC();
  const info = useQuery(trpc.system.info.queryOptions());
  const clock = useSubscription(trpc.system.clock.subscriptionOptions());
  const connection = useConnectionState();

  return (
    <ConnectionDetailView
      server={toServerDetails(info, clock.data?.now, connection)}
      keepRunning={useKeepRunning()}
    />
  );
}
