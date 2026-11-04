import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTRPCClient } from '#features/connection';
import { PageAddresses } from './page-addresses';

// The App's Page addresses on the connected Server, drawn through `plugins.draw`.
export function usePageAddresses(): PageAddresses {
  const client = useQueryClient();
  const draw = useTRPCClient().plugins.draw.query;

  return useMemo(() => new PageAddresses(client, draw), [client, draw]);
}
