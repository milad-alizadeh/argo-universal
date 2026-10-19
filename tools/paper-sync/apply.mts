import type { PaperClient } from './client.mts';
import { createNodes } from './create-nodes.mts';
import type { Binding } from './model.mts';
import { patchNodes } from './patch-nodes.mts';
import type { SyncPlan } from './plan-types.mts';
import { hasChanges, planSync, sameSnapshot } from './plan.mts';
import { preflightInsertions } from './preflight.mts';
import { SnapshotReader } from './snapshot-reader.mts';

function reader(client: PaperClient, plan: SyncPlan): SnapshotReader {
  return new SnapshotReader(
    client,
    new Set(
      [...plan.master.nodes, ...plan.before.nodes]
        .values()
        .filter((node) => node.nested)
        .map((node) => node.name)
        .toArray(),
    ),
  );
}

type PlanSummary = {
  name: string;
  fileId: string;
  nodeId: string;
  additions: number;
  removals: number;
  moves: number;
  styles: number;
  texts: number;
  svg: number;
  textOverrides: Record<string, string>;
};

async function checkCurrent(
  client: PaperClient,
  original: SyncPlan,
): Promise<void> {
  const current = await reader(client, original).read(
    original.before.fileId,
    original.before.rootId,
  );

  if (!sameSnapshot(current, original.before))
    throw new Error(
      `${original.binding.name}: copy changed after the plan; run again`,
    );
}

async function verifyApplied(
  client: PaperClient,
  plan: SyncPlan,
): Promise<Binding> {
  const after = await reader(client, plan).read(
    plan.before.fileId,
    plan.before.rootId,
  );

  const remaining = planSync(plan.master, after, plan.binding);

  if (hasChanges(remaining))
    throw new Error(
      `${plan.binding.name}: verification found remaining differences: ${JSON.stringify(summarize(remaining))}`,
    );

  return remaining.binding;
}

export async function applyPlan(
  client: PaperClient,
  original: SyncPlan,
): Promise<Binding> {
  await checkCurrent(client, original);
  await preflightInsertions(client, original);
  const plan = structuredClone(original);
  await createNodes(client, plan);
  await patchNodes(client, plan);

  return verifyApplied(client, plan);
}

export function summarize(plan: SyncPlan): PlanSummary {
  return {
    name: plan.binding.name,
    fileId: plan.before.fileId,
    nodeId: plan.before.rootId,
    additions: plan.creates.length,
    removals: plan.removes.length,
    moves: plan.moves.length,
    styles: plan.styles.length,
    texts: plan.texts.length,
    svg: plan.svgReplacements.length,
    textOverrides: plan.binding.textOverrides,
  };
}
