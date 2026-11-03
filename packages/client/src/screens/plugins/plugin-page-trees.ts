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

// Never fetched: the trees come from the Plugin's own stream.
export function useKeptPluginTree(page: PluginViewInput): WireNode | null {
  const { data } = useQuery<WireNode>({
    queryKey: keptTreeKey(page),
    queryFn: skipToken,
  });

  return data ?? null;
}

export function keepPluginTree(
  client: QueryClient,
  page: PluginViewInput,
  tree: WireNode,
): void {
  client.setQueryData(keptTreeKey(page), tree);
}

const isTree = ({ queryKey }: Query): boolean =>
  queryKey[0] === pluginPageTrees;

/*
 * A page still watching a tree has to stop drawing it, so its entry is reset, which it hears; only then can the
 * entries nothing is watching leave the cache.
 */
async function dropWhere(
  client: QueryClient,
  dropped: (query: Query) => boolean,
): Promise<void> {
  const predicate = (query: Query): boolean => isTree(query) && dropped(query);

  await client.resetQueries({ predicate });
  client.removeQueries({
    predicate: (query) => predicate(query) && query.getObserversCount() === 0,
  });
}

// Drops one Plugin's trees, or with no Plugin every tree.
export function dropPluginTrees(
  client: QueryClient,
  pluginId?: string,
): Promise<void> {
  return dropWhere(
    client,
    ({ queryKey }) => pluginId === undefined || queryKey[1] === pluginId,
  );
}

export function dropTreesOfPluginsOtherThan(
  client: QueryClient,
  listed: ReadonlySet<string>,
): Promise<void> {
  return dropWhere(client, ({ queryKey }) => !listed.has(String(queryKey[1])));
}
