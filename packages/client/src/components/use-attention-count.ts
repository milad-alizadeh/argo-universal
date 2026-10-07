import { useSubscription } from '@trpc/tanstack-react-query';
import { useTRPC } from '../trpc/context';

// Badges show counts above this as "99+".
export const maximumAttentionBadgeCount = 99;

// The Sessions that need input or are Unread, live from the Server, for every badge (spec 0003).
export function useAttentionCount() {
  const trpc = useTRPC();
  const counts = useSubscription(trpc.session.counts.subscriptionOptions());
  return counts.data?.attention ?? 0;
}
