import { z } from 'zod';
import type { PaperClient } from './client.mts';
import {
  nodeSchema,
  stylesSchema,
  type Snapshot,
  type PaperNode,
  type DesignNode,
} from './model.mts';
import { svgFromJsx } from './svg.mts';

const stylesResponse = z.object({ styles: z.record(z.string(), stylesSchema) });

async function readNodes(
  client: PaperClient,
  fileId: string,
  rootId: string,
): Promise<PaperNode[]> {
  const nodes: PaperNode[] = [];
  const queue = [rootId];
  while (queue.length) {
    if (nodes.length >= 500)
      throw new Error(
        'Component exceeds 500 non-vector nodes; narrow the component boundary',
      );
    const node = await client.read(
      'get_node_info',
      { fileId, nodeId: queue.shift()! },
      nodeSchema,
    );
    nodes.push(node);
    if (node.component !== 'SVG') queue.push(...node.childIds);
  }
  return nodes;
}

async function readSvg(
  client: PaperClient,
  fileId: string,
  node: PaperNode,
): Promise<string | null> {
  if (node.component !== 'SVG') return null;
  const text = await client.call('get_jsx', {
    fileId,
    nodeId: node.id,
    format: 'inline-styles',
  });
  const jsx = text.find((block) => block.trimStart().startsWith('('));
  if (!jsx) throw new Error(`No SVG export for ${node.name}`);
  return svgFromJsx(jsx);
}

export async function readSnapshot(
  client: PaperClient,
  fileId: string,
  rootId: string,
): Promise<Snapshot> {
  const nodes = await readNodes(client, fileId, rootId);
  const result: DesignNode[] = [];
  for (let offset = 0; offset < nodes.length; offset += 40) {
    const batch = nodes.slice(offset, offset + 40);
    const { styles } = await client.read(
      'get_computed_styles',
      { fileId, nodeIds: batch.map((node) => node.id) },
      stylesResponse,
    );
    for (const node of batch) {
      if (!styles[node.id]) throw new Error(`Missing styles for ${node.name}`);
      result.push({
        ...node,
        childIds: node.component === 'SVG' ? [] : node.childIds,
        styles: styles[node.id]!,
        svg: await readSvg(client, fileId, node),
      });
    }
  }
  return { fileId, rootId, nodes: result };
}
