import { z } from 'zod';
import type { PaperClient } from './client.mts';
import { insideBoards, withoutBoards } from './excluded-areas.mts';
import type { IndexedNode } from './index-model.mts';
import { required } from './model.mts';
import { parseSummary } from './summary.mts';

const summarySchema = z.object({
  summary: z.string(),
  truncated: z.boolean().optional(),
});

type Walk = {
  nodes: Map<string, IndexedNode>;
  queue: string[];
  visited: Set<string>;
  boards: Set<string>;
};

async function subtree(
  client: PaperClient,
  fileId: string,
  nodeId: string,
): Promise<ReturnType<typeof parseSummary>> {
  const args = { fileId, nodeId };

  let result = await summary(client, { ...args, depth: 3 });

  if (result.truncated) result = await summary(client, { ...args, depth: 1 });

  if (result.truncated)
    throw new Error(`Index truncated below ${nodeId}; scan is incomplete`);

  return parseSummary(result.summary);
}

function merge(walk: Walk, parsed: ReturnType<typeof parseSummary>): void {
  for (const node of parsed.nodes)
    if (!walk.nodes.has(node.id)) walk.nodes.set(node.id, node);
  walk.queue.push(
    ...parsed.expand.filter((id) => !insideBoards(id, walk.nodes, walk.boards)),
  );
}

async function visit(
  client: PaperClient,
  fileId: string,
  walk: Walk,
): Promise<void> {
  const nodeId = required(walk.queue.shift());

  if (walk.visited.has(nodeId)) return;
  walk.visited.add(nodeId);
  merge(walk, await subtree(client, fileId, nodeId));
}

export async function indexPage(
  client: PaperClient,
  fileId: string,
  root: { rootId: string; boards: Set<string> },
): Promise<IndexedNode[]> {
  const { rootId, boards } = root;

  const walk: Walk = {
    nodes: new Map(),
    queue: [rootId],
    visited: new Set(),
    boards,
  };

  while (walk.queue.length) await visit(client, fileId, walk);

  return withoutBoards([...walk.nodes.values()], boards);
}

async function summary(
  client: PaperClient,
  args: { fileId: string; nodeId: string; depth: number },
): Promise<z.infer<typeof summarySchema>> {
  return client.read('get_tree_summary', args, summarySchema);
}
