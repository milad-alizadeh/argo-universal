import { useQuery } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import type * as React from 'react';
import { ConnectionView } from '../components/connection-view';
import { useConnectionState } from '../state/context';
import { useTRPC } from '../trpc/context';
import { toServerDetails } from './to-server-details';

export function ConnectionScreen(): React.JSX.Element {
  const trpc = useTRPC();
  const info = useQuery(trpc.system.info.queryOptions());
  const clock = useSubscription(trpc.system.clock.subscriptionOptions());
  const connection = useConnectionState();
  return (
    <ConnectionView
      connection={connection}
      server={toServerDetails(info, clock.data?.now)}
    />
  );
}
