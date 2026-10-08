import { useSubscription } from '@trpc/tanstack-react-query';
import { useResubscribeOnReconnect } from '../connection/context';
import { useTRPC } from '../trpc/context';

// The Sessions that need input or are Unread, live from the Server, for every badge.
export function useAttentionCount(): number {
  const trpc = useTRPC();
  const counts = useSubscription(trpc.session.counts.subscriptionOptions());
  useResubscribeOnReconnect(counts);
  return counts.data?.attention ?? 0;
}
