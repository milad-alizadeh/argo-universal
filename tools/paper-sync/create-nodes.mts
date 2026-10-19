import { z } from 'zod';
import type { PaperClient } from './client.mts';
import { required, type DesignNode } from './model.mts';
import { createNested } from './nested-create.mts';
import { htmlFor } from './node-html.mts';
import type { SyncPlan } from './plan-types.mts';

const childrenSchema = z.object({
  children: z.array(z.object({ id: z.string() })),
});

function addedNode(
  before: z.infer<typeof childrenSchema>,
  after: z.infer<typeof childrenSchema>,
  name: string,
): string {
  const added = after.children.filter(
    (child) => !before.children.some((old) => old.id === child.id),
  );

  if (added.length !== 1)
    throw new Error(`Expected one inserted ${name}, received ${added.length}`);

  return required(added[0]).id;
}

async function insertNode(
  client: PaperClient,
  plan: SyncPlan,
  node: DesignNode,
): Promise<string> {
  const parentId = required(plan.binding.nodes[required(node.parentId)]);
  const args = { fileId: plan.before.fileId, nodeId: parentId };
  const before = await client.read('get_children', args, childrenSchema);
  await writeNode(client, { fileId: plan.before.fileId, parentId }, node);
  const after = await client.read('get_children', args, childrenSchema);

  return addedNode(before, after, node.name);
}

async function replaceSvg(
  client: PaperClient,
  plan: SyncPlan,
  sourceId: string,
): Promise<void> {
  const source = required(
    plan.master.nodes.find((node) => node.id === sourceId),
  );

  const previous = required(plan.binding.nodes[sourceId]);
  plan.binding.nodes[sourceId] = await insertNode(client, plan, source);
  plan.removes.push(previous);
}

export async function createNodes(
  client: PaperClient,
  plan: SyncPlan,
): Promise<void> {
  for (const creation of plan.creates)
    await createNode(client, plan, creation.node);

  for (const sourceId of plan.svgReplacements)
    await replaceSvg(client, plan, sourceId);
}

async function writeNode(
  client: PaperClient,
  destination: { fileId: string; parentId: string },
  node: DesignNode,
): Promise<void> {
  const args = {
    fileId: destination.fileId,
    targetNodeId: destination.parentId,
    mode: 'insert-children',
  };

  await client.call('write_html', { ...args, html: htmlFor(node) });
}

async function createNode(
  client: PaperClient,
  plan: SyncPlan,
  node: DesignNode,
): Promise<void> {
  if (node.nested)
    await createNested({ client, plan, insert: insertNode }, node);
  else plan.binding.nodes[node.id] = await insertNode(client, plan, node);
}
