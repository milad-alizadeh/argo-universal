import { useSubscription } from '@trpc/tanstack-react-query';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import { usePageAddresses } from './use-page-addresses';

/*
 * The Server pushes a stale mark after any of a Plugin's Operations, whoever ran it, or when the Plugin
 * says its pages changed. The App marks the kept trees it names stale, or all the Plugin's, and draws again
 * only those on screen; nothing polls. The App's frame holds it, so an App listens once for every Loader
 * page and Workbench card, whichever Section is shown.
 */
export function useStaleMarks(): void {
  const addresses = usePageAddresses();

  const subscription = useSubscription(
    useTRPC().plugins.stale.subscriptionOptions(undefined, {
      onData: (mark) => addresses.markStale(mark),
    }),
  );

  useResubscribeOnReconnect(subscription);
}
