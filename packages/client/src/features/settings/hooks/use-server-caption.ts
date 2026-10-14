import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import { useServerCaption } from '#lib/product/server-place';

// "On <the Server computer's name>" for pages whose settings the Server keeps.
export function useServerPageCaption(): string | undefined {
  const trpc = useTRPC();
  const info = useQuery(trpc.system.info.queryOptions());

  return useServerCaption(info.data?.name);
}
