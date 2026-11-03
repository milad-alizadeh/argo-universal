import type { PluginViewInput, WireNode } from '@repo/contracts/plugins/wire';
import {
  skipToken,
  useQuery,
  type Query,
  type QueryClient,
} from '@tanstack/react-query';
import { pluginPageTrees } from '../../query-cache';

/*
 * The last tree each Plugin page drew, kept in memory for the Connection, so a page opened again draws at once while
 * its view opens on the Server (ADR-0048). Only the App's page hook fills it; the Server's first snapshot replaces it.
 */
export const keptTreeKey = ({ pluginId, ...page }: PluginViewInput) =>
  [pluginPageTrees, pluginId, page] as const;

export function keepPluginTree(
  client: QueryClient,
  page: PluginViewInput,
  tree: WireNode,
): void {
  client.setQueryData(keptTreeKey(page), tree);
}

/*
 * The tree kept for a page, or null. A page drawing its live view passes `watching: false`, so it does not draw again
 * for each tree it keeps; it reads whatever the entry holds the next time it draws.
 */
export function useKeptPluginTree(
  page: PluginViewInput,
  watching: boolean,
): WireNode | null {
  const { data } = useQuery<WireNode>({
    queryKey: keptTreeKey(page),
    queryFn: skipToken,
    subscribed: watching,
  });

  return data ?? null;
}

/*
 * Drops the trees of each Plugin `dropped` names. A page still watching a tree has to stop drawing it, so its entry is
 * reset, which it hears; the entries nothing is watching leave the cache.
 */
export function dropPluginTrees(
  client: QueryClient,
  dropped: (pluginId: string) => boolean,
): void {
  const predicate = ({ queryKey }: Query): boolean =>
    queryKey[0] === pluginPageTrees && dropped(String(queryKey[1]));

  void client.resetQueries({ predicate });
  client.removeQueries({
    predicate: (query) => predicate(query) && query.getObserversCount() === 0,
  });
}
