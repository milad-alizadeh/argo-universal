import { join } from 'node:path';
import { applyPlan, summarize } from './apply.mts';
import type { PaperClient } from './client.mts';
import { required, type Binding, type Registry } from './model.mts';
import type { SyncPlan } from './plan-types.mts';
import { hasChanges, sameSnapshot } from './plan.mts';
import { registerNested } from './register-nested.mts';
import { SnapshotReader } from './snapshot-reader.mts';
import { saveJson } from './storage.mts';

type ApplyContext = {
  registry: Registry;
  path: string;
  runDirectory: string;
  plans: SyncPlan[];
};

async function applyCopy(
  client: PaperClient,
  plan: SyncPlan,
  registry: Registry,
): Promise<Binding> {
  const names = new Set(registry.families.map((family) => family.name));

  const master = await new SnapshotReader(client, names).read(
    plan.master.fileId,
    plan.master.rootId,
  );

  if (!sameSnapshot(master, plan.master))
    throw new Error(`${plan.binding.name}: master changed during sync`);

  return hasChanges(plan) ? applyPlan(client, plan) : plan.binding;
}

function updateBinding(registry: Registry, binding: Binding): void {
  const family = required(
    registry.families.find((item) => item.name === binding.name),
  );

  family.copies = family.copies.map((copy) =>
    copy.fileId === binding.fileId && copy.nodeId === binding.nodeId
      ? binding
      : copy,
  );
}

async function saveCopy(
  client: PaperClient,
  context: ApplyContext,
  plan: SyncPlan,
): Promise<void> {
  const binding = await applyCopy(client, plan, context.registry);
  updateBinding(context.registry, binding);
  await registerNested(client, plan, { registry: context.registry, binding });
  await saveJson(context.path, context.registry);
  await saveJson(join(context.runDirectory, 'progress.json'), context.registry);
  console.log(JSON.stringify(summarize(plan)));
}

async function release(client: PaperClient, plans: SyncPlan[]): Promise<void> {
  for (const fileId of new Set(plans.map((plan) => plan.before.fileId)))
    await client.call('finish_working_on_nodes', { fileId });
}

export async function applyRegistry(
  client: PaperClient,
  context: ApplyContext,
): Promise<void> {
  await saveJson(join(context.runDirectory, 'before.json'), {
    registry: context.registry,
    plans: context.plans,
  });

  try {
    for (const plan of context.plans) await saveCopy(client, context, plan);
  } finally {
    await release(client, context.plans);
  }
}
