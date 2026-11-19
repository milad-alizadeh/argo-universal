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
 * drawing, so a page opened again after a restart loads in its own rows' places. It is kept by Server, Plugin,
 * Project and Page path: one Project's rows never draw as another's, while a page opened in a new Session of the
 * same Project still has them.
 */
export interface LoadingPage {
  pluginId: string;
  path: string;
  projectId?: string;
}

// One Server's page, as both its storage and its query are keyed.
interface KeptAt {
  serverId: string;
  page: LoadingPage;
}

// What a loading page draws under: its kept tree, null when it has none, or `reading` while this Device looks.
export type LoadingTreeRead = WireNode | null | 'reading';

// A loading tree larger than this, in characters, is a page with more than rows in it, and not worth a Device's storage.
const largestLoadingTree = 65_536;

const storageKey = ({ serverId, page }: KeptAt): string =>
  `${serverId}:plugin-loading-tree:${page.pluginId}:${page.projectId ?? ''}:${page.path}`;

type TreeKey = readonly ['plugin-loading-tree', string];

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

function loadingTreeQuery(at: KeptAt): TreeQuery {
  const key = storageKey(at);

  return queryOptions({
    queryKey: ['plugin-loading-tree', key] as const,
    queryFn: () => AsyncStorage.getItem(key).then(keptTree).catch(readFailed),
    staleTime: Infinity,
    // This Device's storage answers while the Server is unreachable.
    networkMode: 'always',
  });
}

export function useLoadingTree(page: LoadingPage): LoadingTreeRead {
  const { id } = useServerScope();

  const { data, isPending } = useQuery(
    loadingTreeQuery({ serverId: id, page }),
  );

  return isPending ? 'reading' : (data ?? null);
}

const keepFailed = (cause: unknown): void => {
  console.error('Could not keep a Plugin page loading tree', cause);
};

/*
 * The text last kept for each page this run, so a page that redraws with the same first rows is compared as one
 * string and written to storage only when they change.
 */
const lastKept = new Map<string, string>();

export function keep(client: QueryClient, at: KeptAt, root: WireNode): void {
  const tree = loadingTree(root);
  const text = JSON.stringify(tree);
  const key = storageKey(at);

  if (text.length > largestLoadingTree || lastKept.get(key) === text) return;

  lastKept.set(key, text);
  client.setQueryData(loadingTreeQuery(at).queryKey, tree);
  AsyncStorage.setItem(key, text).catch(keepFailed);
}

// Keeps the page's loading tree from each tree it draws, writing only when its first rows changed.
export function useKeepLoadingTree(
  { pluginId, path, projectId }: LoadingPage,
  root: WireNode | null,
): void {
  const { id } = useServerScope();
  const client = useQueryClient();

  useEffect(() => {
    if (root)
      keep(client, { serverId: id, page: { pluginId, path, projectId } }, root);
  }, [client, id, pluginId, path, projectId, root]);
}
