import { z } from 'zod';
import type { PaperClient } from './client.mts';

const summarySchema = z.object({
  summary: z.string(),
  truncated: z.boolean().optional(),
});
export const fileSchema = z.object({
  fileName: z.string(),
  pageId: z.string(),
  rootNodeId: z.string(),
  pages: z.array(
    z.object({ type: z.string(), id: z.string(), name: z.string() }),
  ),
  artboards: z.array(z.object({ id: z.string(), name: z.string() })),
});
export type IndexedNode = {
  id: string;
  name: string;
  component: string;
  parentId: string | null;
};

export function parseSummary(summary: string): {
  nodes: IndexedNode[];
  expand: string[];
} {
  const nodes: IndexedNode[] = [];
  const expand: string[] = [];
  const stack: IndexedNode[] = [];
  for (const line of summary.split('\n')) {
    const match = /^(\s*)(\w+) "(.*)" \(([^)]+)\)/.exec(line);
    if (!match) {
      if (line.trim().startsWith('...') && stack.at(-1)?.component !== 'SVG')
        expand.push(stack.at(-1)!.id);
      continue;
    }
    const depth = match[1]!.length / 2;
    const node = {
      id: match[4]!,
      name: match[3]!,
      component: match[2]!,
      parentId: stack[depth - 1]?.id ?? null,
    };
    nodes.push(node);
    stack.length = depth;
    stack.push(node);
  }
  return { nodes, expand };
}

export async function indexPage(
  client: PaperClient,
  fileId: string,
  rootId: string,
): Promise<IndexedNode[]> {
  const nodes = new Map<string, IndexedNode>();
  const queue = [rootId];
  const visited = new Set<string>();
  while (queue.length) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    let result = await client.read(
      'get_tree_summary',
      { fileId, nodeId, depth: 3 },
      summarySchema,
    );
    if (result.truncated)
      result = await client.read(
        'get_tree_summary',
        { fileId, nodeId, depth: 1 },
        summarySchema,
      );
    if (result.truncated)
      throw new Error(
        `Index truncated below ${nodeId}; no complete inventory available`,
      );
    const parsed = parseSummary(result.summary);
    for (const node of parsed.nodes)
      if (!nodes.has(node.id)) nodes.set(node.id, node);
    queue.push(...parsed.expand);
  }
  return [...nodes.values()];
}
