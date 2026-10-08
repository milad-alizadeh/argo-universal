import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '../trpc/context';

export function useAgents() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const agents = useQuery(trpc.agents.list.queryOptions());
  const retryProbe = useMutation({
    mutationFn: () =>
      queryClient.fetchQuery(
        trpc.agents.list.queryOptions({ refresh: true }, { staleTime: 0 }),
      ),
    onSuccess: (data) =>
      queryClient.setQueryData(trpc.agents.list.queryKey(), data),
  });
  return { ...agents, retry: () => retryProbe.mutate() };
}
