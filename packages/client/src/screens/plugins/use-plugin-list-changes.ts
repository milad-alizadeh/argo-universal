import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useEffect, useMemo } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import {
  dropPluginTrees,
  dropTreesOfPluginsOtherThan,
} from './plugin-page-trees';
import { refreshPluginList } from './refresh-plugin-list';

/*
 * Keeps the App's copy of the connected Server's Plugin list true to the Server. A Plugin can be turned
 * off from Settings on another Device or from the CLI, and a Plugin that has stopped draws nothing: the
 * list is read again, so the rail drops the Plugin and its open page leaves for Sessions as a reload does.
 * What the App kept of a changed Plugin's pages goes too (ADR-0048).
 */
export function usePluginListChanges(): void {
  const trpc = useTRPC();
  const { changed, reconnected } = usePluginChangeHandlers();

  const subscription = useSubscription(
    trpc.plugins.listChanges.subscriptionOptions(undefined, {
      // Reading on start covers a change made while the App was away or while the stream was starting.
      onStarted: reconnected,
      onData: changed,
    }),
  );

  useResubscribeOnReconnect(subscription);
  useDropTreesOfUnlistedPlugins();
}

interface PluginChangeHandlers {
  changed: (change: { pluginId: string }) => void;
  // The App cannot know what changed while it was away, so it keeps no tree from before.
  reconnected: () => void;
}

// The Plugin list and the declared Slot items both follow which Plugins the Server runs.
function usePluginChangeHandlers(): PluginChangeHandlers {
  const trpc = useTRPC();
  const cache = useQueryClient();

  return useMemo(() => {
    const reread = (): void => {
      void refreshPluginList(cache, [
        trpc.plugin.list.queryFilter(),
        trpc.plugins.declared.queryFilter(),
      ]);
    };

    return {
      changed: ({ pluginId }): void => {
        void dropPluginTrees(cache, pluginId);
        reread();
      },
      reconnected: (): void => {
        void dropPluginTrees(cache);
        reread();
      },
    };
  }, [cache, trpc]);
}

// A Plugin the list no longer names, such as one removed from disk, draws nothing again.
function useDropTreesOfUnlistedPlugins(): void {
  const cache = useQueryClient();
  const { data } = useQuery(useTRPC().plugin.list.queryOptions());

  const listed = useMemo(
    () =>
      data &&
      new Set(
        data.plugins
          .filter((plugin) => plugin.enabled)
          .map((plugin) => plugin.manifest.id),
      ),
    [data],
  );

  useEffect(() => {
    if (listed) void dropTreesOfPluginsOtherThan(cache, listed);
  }, [cache, listed]);
}
