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

// Every kept tree shows the call's optimistic props on the node it names; the trees before are kept to put back.
export function showOptimistic(
  { client, draws }: DrawCache,
  { optimistic }: OperationCall,
): Snapshot {
  if (!optimistic) return [];

  const filter = draws.pathFilter();
  const before = client.getQueriesData<Answer>(filter);

  client.setQueriesData<Answer>(filter, (answer) =>
    answer?.ok ? { ...answer, root: flipped(answer.root, optimistic) } : answer,
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

type Optimistic = NonNullable<OperationCall['optimistic']>;

function flipped(node: WireNode, optimistic: Optimistic): WireNode {
  const props =
    node.key === optimistic.key
      ? { ...node.props, ...optimistic.props }
      : node.props;

  return {
    ...node,
    props,
    children: node.children.map((child) => flipped(child, optimistic)),
  };
}

// Every kept address of the Plugin whose path a stale pattern matches is drawn again.
export function drawStale(
  { client, draws }: DrawCache,
  pluginId: string,
  stale: readonly string[],
): void {
  void client.invalidateQueries({
    ...draws.pathFilter(),
    predicate: (query) => isStale(addressOf(query), pluginId, stale),
  });
}

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
