import { matchPagePath } from '@repo/contracts/plugins/page-address';
import type { OperationCall, WireNode } from '@repo/contracts/plugins/wire';
import { showToast } from '@repo/kit/primitives/overlays/toast';
import type { Query, QueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import type { useTRPC } from '#features/connection';

export type Answer =
  | { ok: true; root: WireNode }
  | { ok: false; error: string };

// The App's kept Plugin trees: every Loader page address drawn, under one tRPC query path.
export type DrawCache = {
  client: QueryClient;
  draws: ReturnType<typeof useTRPC>['plugins']['draw'];
};

type Snapshot = [readonly unknown[], Answer | undefined][];

/*
 * Every kept tree shows the call's optimistic props on the nodes it names, at once. Draws in flight are
 * cancelled first, so an answer read before the Operation cannot paint over the patch; the trees before
 * are kept to put back.
 */
export async function showOptimistic(
  { client, draws }: DrawCache,
  { optimistic }: OperationCall,
): Promise<Snapshot> {
  if (!optimistic) return [];

  const filter = draws.pathFilter();
  const patches = new Map(optimistic.map(({ key, props }) => [key, props]));

  await client.cancelQueries(filter);

  const before = client.getQueriesData<Answer>(filter);

  client.setQueriesData<Answer>(filter, (answer) =>
    answer?.ok ? { ...answer, root: patched(answer.root, patches) } : answer,
  );

  return before;
}

export function putBack(
  client: QueryClient,
  error: Error,
  before: Snapshot | undefined,
): void {
  for (const [key, answer] of before ?? []) client.setQueryData(key, answer);
  showToast({
    title: 'That did not work',
    message: error.message,
    tone: 'danger',
  });
}

type Patches = Map<string, WireNode['props']>;

// A node's slots are walked as its children are: a row's menu Action sits in its `actions` slot.
function patched(node: WireNode, patches: Patches): WireNode {
  return {
    ...node,
    props: { ...node.props, ...patches.get(node.key) },
    children: node.children.map((child) => patched(child, patches)),
    slots: Object.fromEntries(
      Object.entries(node.slots).map(([name, nodes]) => [
        name,
        nodes.map((child) => patched(child, patches)),
      ]),
    ),
  };
}

/*
 * Every kept address of the Plugin whose path a stale pattern matches is marked stale; only those on a
 * focused screen draw again now (a screen out of focus is not subscribed), the rest when they come back.
 * A draw already running read before the change, so it is left to finish and then marked again.
 */
export function drawStale(
  { client, draws }: DrawCache,
  pluginId: string,
  stale: readonly string[],
): void {
  const filters = {
    ...draws.pathFilter(),
    predicate: (query: Query): boolean =>
      isStale(addressOf(query), pluginId, stale),
  };

  const landed = markWhenLanded(client);

  for (const query of client.getQueryCache().findAll(filters)) landed(query);
  void client.invalidateQueries(filters, { cancelRefetch: false });
}

const markWhenLanded =
  (client: QueryClient) =>
  ({ queryKey, promise }: Query): void => {
    const mark = markAgain(client, queryKey);

    void promise?.then(mark, mark);
  };

const markAgain =
  (client: QueryClient, queryKey: Query['queryKey']) => (): void =>
    void client.invalidateQueries(
      { queryKey, exact: true },
      { cancelRefetch: false },
    );

type Address = { pluginId: string; path: string };

// A draw query's key holds its address as tRPC's input.
const DrawKey = z.tuple([
  z.unknown(),
  z.object({ input: z.object({ pluginId: z.string(), path: z.string() }) }),
]);

const addressOf = (query: Query): Address | null => {
  const parsed = DrawKey.safeParse(query.queryKey);

  return parsed.success ? parsed.data[1].input : null;
};

const isStale = (
  address: Address | null,
  pluginId: string,
  stale: readonly string[],
): boolean =>
  address?.pluginId === pluginId &&
  stale.some((pattern) => matchPagePath(pattern, address.path) !== null);
