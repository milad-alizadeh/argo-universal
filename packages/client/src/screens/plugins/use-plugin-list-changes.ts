import { useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useMemo } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';

/*
 * Keeps the App's copy of the connected Server's Plugin list true to the Server. A Plugin can be turned
 * off from Settings on another Device or from the CLI, and a Plugin that has stopped draws nothing: the
 * list is read again, so the rail drops the Plugin and its open page leaves for Sessions as a reload does.
 */
export function usePluginListChanges(): void {
  const trpc = useTRPC();
  const reread = usePluginListReread();

  const subscription = useSubscription(
    trpc.plugins.listChanges.subscriptionOptions(undefined, {
      // Reading on start covers a change made while the App was away or while the stream was starting.
      onStarted: reread,
      onData: reread,
    }),
  );

  useResubscribeOnReconnect(subscription);
}

// The Plugin list and the declared Slot items both follow which Plugins the Server runs.
function usePluginListReread(): () => void {
  const trpc = useTRPC();
  const cache = useQueryClient();

  return useMemo(
    () => (): void => {
      void cache.invalidateQueries(trpc.plugin.list.queryFilter());
      void cache.invalidateQueries(trpc.plugins.declared.queryFilter());
    },
    [cache, trpc],
  );
}
