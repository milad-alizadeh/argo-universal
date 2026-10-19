import { enroll } from './bind.mts';
import { boundaryNames } from './boundaries.mts';
import type { PaperClient } from './client.mts';
import { required, type Binding, type Registry } from './model.mts';
import type { SyncPlan } from './plan-types.mts';
import { readSnapshot } from './read.mts';
import { SnapshotReader } from './snapshot-reader.mts';

type Context = { registry: Registry; reader: SnapshotReader; binding: Binding };

type Family = Registry['families'][number];

async function enrollNested(
  context: Context,
  family: Family,
  nodeId: string,
): Promise<void> {
  const master = await context.reader.read(
    family.master.fileId,
    family.master.nodeId,
  );

  const copy = await context.reader.read(context.binding.fileId, nodeId);
  family.copies.push({
    ...enroll(master, copy),
    location: context.binding.location,
  });
}

async function registerNode(
  context: Context,
  node: { id: string; name: string },
): Promise<void> {
  const family = context.registry.families.find(
    (item) => item.name === node.name,
  );

  if (!family) return;
  const fileId = context.binding.fileId;

  if (registered(family, fileId, node.id)) return;
  await enrollNested(context, family, node.id);
}

async function registerTree(
  client: PaperClient,
  context: Context,
  sourceId: string,
): Promise<void> {
  const rootId = required(context.binding.nodes[sourceId]);
  const tree = await readSnapshot(client, context.binding.fileId, rootId);

  for (const node of tree.nodes) await registerNode(context, node);
}

export async function registerNested(
  client: PaperClient,
  plan: SyncPlan,
  input: { registry: Registry; binding: Binding },
): Promise<void> {
  const names = boundaryNames(input.registry);

  const context: Context = {
    ...input,
    reader: new SnapshotReader(client, names),
  };

  for (const creation of plan.creates.filter((entry) => entry.node.nested))
    await registerTree(client, context, creation.sourceId);
}

function registered(family: Family, fileId: string, nodeId: string): boolean {
  return family.copies.some(
    (copy) => copy.fileId === fileId && copy.nodeId === nodeId,
  );
}
