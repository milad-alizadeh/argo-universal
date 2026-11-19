import AsyncStorage from '@react-native-async-storage/async-storage';
import { WireNode } from '@repo/contracts/plugins/wire';
import {
  type DataTag,
  type QueryClient,
  queryOptions,
  type UnusedSkipTokenOptions,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { useServerScope } from '#lib/product/server-scope';
import { loadingTree } from '../utils/loading-tree';

/*
 * The tree each Plugin page draws under its Skeleton while it loads, kept on this Device from the page's last
 * drawing, so a page opened again after a restart loads in its own rows' places. It is by Plugin and Page path
 * alone: the same page in another Project draws the same rows.
 */
interface LoadingPage {
  pluginId: string;
  path: string;
}

const storageKey = (serverId: string, page: LoadingPage): string =>
  `${serverId}:plugin-loading-tree:${page.pluginId}:${page.path}`;

type TreeKey = readonly ['plugin-loading-tree', string, string, string];

const queryKey = (serverId: string, page: LoadingPage): TreeKey =>
  ['plugin-loading-tree', serverId, page.pluginId, page.path] as const;

// Anything kept that does not read as a tree is as if nothing were kept.
function keptTree(saved: string | null): WireNode | null {
  if (saved === null) return null;

  try {
    return WireNode.parse(JSON.parse(saved));
  } catch {
    return null;
  }
}

const readFailed = (cause: unknown): null => {
  console.error('Could not read a Plugin page loading tree', cause);

  return null;
};

type TreeQuery = UnusedSkipTokenOptions<
  WireNode | null,
  Error,
  WireNode | null,
  TreeKey
> & { queryKey: DataTag<TreeKey, WireNode | null, Error> };

function loadingTreeQuery(serverId: string, page: LoadingPage): TreeQuery {
  return queryOptions({
    queryKey: queryKey(serverId, page),
    queryFn: () =>
      AsyncStorage.getItem(storageKey(serverId, page))
        .then(keptTree)
        .catch(readFailed),
    staleTime: Infinity,
    // This Device's storage answers while the Server is unreachable.
    networkMode: 'always',
  });
}

// The tree a loading page draws under its Skeleton; null until one is read, or when the page never drew.
export function useLoadingTree(page: LoadingPage): WireNode | null {
  const { id } = useServerScope();
  const { data } = useQuery(loadingTreeQuery(id, page));

  return data ?? null;
}

const keepFailed = (cause: unknown): void => {
  console.error('Could not keep a Plugin page loading tree', cause);
};

interface Keeping {
  client: QueryClient;
  serverId: string;
  page: LoadingPage;
}

const sameTree = (
  first: WireNode | null | undefined,
  second: WireNode,
): boolean => JSON.stringify(first) === JSON.stringify(second);

function keep({ client, serverId, page }: Keeping, root: WireNode): void {
  const tree = loadingTree(root);
  const { queryKey: key } = loadingTreeQuery(serverId, page);

  if (tree === null || sameTree(client.getQueryData(key), tree)) return;

  client.setQueryData(key, tree);
  AsyncStorage.setItem(storageKey(serverId, page), JSON.stringify(tree)).catch(
    keepFailed,
  );
}

// Keeps the page's loading tree from each tree it draws, writing only when its first rows changed.
export function useKeepLoadingTree(
  { pluginId, path }: LoadingPage,
  root: WireNode | null,
): void {
  const { id } = useServerScope();
  const client = useQueryClient();

  useEffect(() => {
    if (root) keep({ client, serverId: id, page: { pluginId, path } }, root);
  }, [client, id, pluginId, path, root]);
}
