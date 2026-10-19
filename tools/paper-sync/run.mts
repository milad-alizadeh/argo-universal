import { join } from 'node:path';
import { summarize } from './apply.mts';
import { buildPlans } from './check.mts';
import type { PaperClient } from './client.mts';
import type { SyncPlan } from './plan-types.mts';
import { hasChanges } from './plan.mts';
import { applyRegistry } from './run-apply.mts';
import { prepareRun, type RunContext } from './run-context.mts';
import { loadRegistry, saveJson } from './storage.mts';

type RunOptions = { apply: boolean; runDirectory: string };

async function saveChecks(
  directory: string,
  plans: SyncPlan[],
  context: RunContext,
): Promise<void> {
  await saveJson(join(directory, 'plan.json'), plans.map(summarize));
  await saveJson(join(directory, 'details.json'), plans);
  await saveJson(join(directory, 'errors.json'), context.errors);
  console.log(
    `${plans.length} checked; ${plans.filter(hasChanges).length} drifted; ${context.errors.length} errors. Report: ${directory}`,
  );
}

export async function syncRegistry(
  client: PaperClient,
  path: string,
  options: RunOptions,
): Promise<void> {
  const registry = await loadRegistry(path);
  const context = await prepareRun(client, registry);
  const plans = await buildPlans(context, registry);
  await saveChecks(options.runDirectory, plans, context);

  if (context.errors.length)
    throw new Error('Check errors; inspect errors.json. Nothing applied.');

  const runDirectory = options.runDirectory;
  const application = { registry, plans, path, runDirectory };

  if (options.apply) await applyRegistry(client, application);
}
