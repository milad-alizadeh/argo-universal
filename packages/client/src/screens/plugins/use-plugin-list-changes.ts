import type { PluginList } from '@repo/contracts/plugins';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useEffect, useMemo } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import { dropPluginTrees } from './plugin-page-trees';
import { refreshPluginList } from './refresh-plugin-list';

/*
 * Keeps the App's copy of the connected Server's Plugin list true to the Server. A Plugin can be turned
 * off from Settings on another Device or from the CLI, and a Plugin that has stopped draws nothing: the
 * list is read again, so the rail drops the Plugin and its open page leaves for Sessions as a reload does.
 * What the App kept of a changed Plugin's pages goes too (ADR-0048).
 */
export function usePluginListChanges(): void {
  const trpc = useTRPC();
  const changed = usePluginChanged();

  const subscription = useSubscription(
    trpc.plugins.listChanges.subscriptionOptions(undefined, {
      /*
       * Reading on start covers a change made while the App was away or while the stream was starting; the App cannot
       * know what changed then, so it keeps no tree from before.
       */
      onStarted: () => changed(() => true),
      onData: ({ pluginId }) => changed((id) => id === pluginId),
    }),
  );

  useResubscribeOnReconnect(subscription);
  useDropTreesOfUnlistedPlugins();
}

// The Plugin list and the declared Slot items both follow which Plugins the Server runs.
function usePluginChanged(): (dropped: (pluginId: string) => boolean) => void {
  const trpc = useTRPC();
  const cache = useQueryClient();

  return useMemo(
    () =>
      (dropped): void => {
        dropPluginTrees(cache, dropped);
        void refreshPluginList(cache, [
          trpc.plugin.list.queryFilter(),
          trpc.plugins.declared.queryFilter(),
        ]);
      },
    [cache, trpc],
  );
}

const enabledIds = (plugins: PluginList['plugins']): Set<string> =>
  new Set(plugins.flatMap((it) => (it.enabled ? [it.manifest.id] : [])));

// A Plugin the list no longer names, such as one removed from disk, draws nothing again.
function useDropTreesOfUnlistedPlugins(): void {
  const cache = useQueryClient();
  const { data } = useQuery(useTRPC().plugin.list.queryOptions());

  useEffect(() => {
    if (!data) return;

    const listed = enabledIds(data.plugins);

    dropPluginTrees(cache, (id) => !listed.has(id));
  }, [cache, data]);
}
