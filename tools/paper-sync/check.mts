import { rejectAmbiguous } from './boundaries.mts';
import {
  getRoot,
  required,
  type Binding,
  type Registry,
  type Snapshot,
} from './model.mts';
import { insideOut } from './ordering.mts';
import type { SyncPlan } from './plan-types.mts';
import { hasChanges, planSync } from './plan.mts';
import { preflightInsertions } from './preflight.mts';
import { type RunContext } from './run-context.mts';
import { checkTokens } from './tokens.mts';

async function checkedPlan(
  context: RunContext,
  source: Snapshot,
  copy: Binding,
): Promise<SyncPlan> {
  matchTokens(context, source, copy);
  const snapshot = await context.reader.read(copy.fileId, copy.nodeId);

  rejectAmbiguous(snapshot, context.registry);

  validateNames(source, snapshot, copy.name);

  const plan = planSync(source, snapshot, copy);
  await preflightInsertions(context.client, plan);

  return plan;
}

async function copyPlans(
  context: RunContext,
  source: Snapshot,
  copy: Binding,
): Promise<SyncPlan[]> {
  try {
    return [await checkedPlan(context, source, copy)];
  } catch (error) {
    const { name, fileId, nodeId } = copy;
    context.errors.push({ name, fileId, nodeId, reason: String(error) });

    return [];
  }
}

async function familyPlans(
  context: RunContext,
  family: Registry['families'][number],
): Promise<SyncPlan[]> {
  const source = context.masters.get(family.name);

  if (!source) return [];
  const plans: SyncPlan[] = [];

  for (const copy of family.copies)
    plans.push(...(await copyPlans(context, source, copy)));
  console.log(
    `${family.name}: ${plans.filter(hasChanges).length}/${plans.length} copies drifted`,
  );

  return plans;
}

export async function buildPlans(
  context: RunContext,
  registry: Registry,
): Promise<SyncPlan[]> {
  const plans: SyncPlan[] = [];

  for (const family of insideOut(registry.families, context.masters))
    plans.push(...(await familyPlans(context, family)));

  return plans;
}

function matchTokens(
  context: RunContext,
  source: Snapshot,
  copy: Binding,
): void {
  checkTokens(
    source,
    required(context.tokens.get(source.fileId)),
    required(context.tokens.get(copy.fileId)),
  );
}

function validateNames(source: Snapshot, copy: Snapshot, name: string): void {
  if (getRoot(copy).name !== name)
    throw new Error('Copy changed state; run scan and enroll');

  if (getRoot(source).name !== name)
    throw new Error('Master renamed; run scan and enroll');
}
