import { useQuery } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import type * as React from 'react';
import {
  ConnectionView,
  type ServerDetails,
} from '../components/connection-view';
import { useConnectionState } from '../state/context';
import { useTRPC } from '../trpc/context';

export function ConnectionScreen(): React.JSX.Element {
  const trpc = useTRPC();
  const info = useQuery(trpc.system.info.queryOptions());
  const clock = useSubscription(trpc.system.clock.subscriptionOptions());
  const connection = useConnectionState();

  let server: ServerDetails;
  if (info.isPending) server = { status: 'loading' };
  else if (info.isError)
    server = { status: 'error', message: info.error.message };
  else server = { status: 'loaded', ...info.data, clock: clock.data?.now };
  return <ConnectionView connection={connection} server={server} />;
}
