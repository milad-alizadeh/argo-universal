import type { PluginBadge } from '@repo/contracts/plugins/runtime';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useResubscribeOnReconnect } from '#features/connection';
import { useTRPC } from '#features/connection';
import { useAttentionCount } from './use-attention-count';

const noBadges: readonly PluginBadge[] = [];

// Each Plugin nav item's badge count, live from the Server; none until the first snapshot arrives.
function usePluginBadges(): readonly PluginBadge[] {
  const trpc = useTRPC();
  const badges = useSubscription(trpc.plugins.badges.subscriptionOptions());
  useResubscribeOnReconnect(badges);

  return badges.data ?? noBadges;
}

export interface SectionBadgeCounts {
  attentionCount: number;
  pluginBadges: readonly PluginBadge[];
}

// The counts every rail tile and drawer row badge is drawn from.
export function useSectionBadgeCounts(): SectionBadgeCounts {
  return {
    attentionCount: useAttentionCount(),
    pluginBadges: usePluginBadges(),
  };
}

// Whether any Session needs attention, which ☰ marks with a dot or badge on a narrow root.
export const useNeedsAttention = (): boolean => useAttentionCount() > 0;
