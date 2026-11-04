import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTRPCClient } from '#features/connection';
import { PageAddresses } from './page-addresses';

// The App's Page addresses on the connected Server, drawn through `plugins.draw` and followed live through `plugins.live`.
export function usePageAddresses(): PageAddresses {
  const client = useQueryClient();
  const { draw, live } = useTRPCClient().plugins;

  return useMemo(
    () =>
      new PageAddresses(client, draw.query, (request, onAnswer) => {
        const subscription = live.subscribe(request, { onData: onAnswer });

        return () => subscription.unsubscribe();
      }),
    [client, draw, live],
  );
}
