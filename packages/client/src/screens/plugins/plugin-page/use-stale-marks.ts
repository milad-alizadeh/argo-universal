import { useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import { useScreenFocused } from '#lib/product/navigation/navigation';
import { drawStale } from './draw-cache';

/*
 * The Server pushes a stale mark after any of a Plugin's Operations, whoever ran it, or when the Plugin
 * says its pages changed. The App marks the matching kept trees stale, and draws again only those on
 * screen; nothing polls. Only the focused page listens, so an App holds one subscription.
 */
export function useStaleMarks(): void {
  const trpc = useTRPC();
  const cache = { client: useQueryClient(), draws: trpc.plugins.draw };

  const subscription = useSubscription(
    trpc.plugins.stale.subscriptionOptions(undefined, {
      enabled: useScreenFocused(),
      onData: ({ pluginId, stale }) => drawStale(cache, pluginId, stale),
    }),
  );

  useResubscribeOnReconnect(subscription);
}
