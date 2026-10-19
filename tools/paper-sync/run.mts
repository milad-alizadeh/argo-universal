import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { applyPlan, summarize } from './apply.mts';
import type { PaperClient } from './client.mts';
import { fileSchema } from './discover.mts';
import { registrySchema, type Registry } from './model.mts';
import { hasChanges, planSync, sameSnapshot, type SyncPlan } from './plan.mts';
import { readSnapshot } from './read.mts';
import { checkTokens, readTokens, type Tokens } from './tokens.mts';

export async function saveJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(`${path}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  await rename(`${path}.tmp`, path);
}

export async function loadRegistry(path: string): Promise<Registry> {
  return registrySchema.parse(JSON.parse(await readFile(path, 'utf8')));
}

async function prepareFiles(
  client: PaperClient,
  registry: Registry,
): Promise<Map<string, Tokens>> {
  const ids = new Set(
    registry.families.flatMap((family) => [
      family.master.fileId,
      ...family.copies.map((copy) => copy.fileId),
    ]),
  );
  const tokens = new Map<string, Tokens>();
  for (const fileId of ids) {
    await client.read('get_basic_info', { fileId }, fileSchema);
    await client.call('get_font_family_info', {
      fileId,
      familyNames: ['SF Pro Text', 'Roboto', 'SF Mono', 'System Sans-Serif'],
    });
    tokens.set(fileId, await readTokens(client, fileId));
  }
  return tokens;
}

export async function buildPlans(
  client: PaperClient,
  registry: Registry,
): Promise<SyncPlan[]> {
  const tokens = await prepareFiles(client, registry);
  const plans: SyncPlan[] = [];
  for (const family of registry.families) {
    const source = await readSnapshot(
      client,
      family.master.fileId,
      family.master.nodeId,
    );
    for (const copy of family.copies) {
      checkTokens(source, tokens.get(source.fileId)!, tokens.get(copy.fileId)!);
      plans.push(
        planSync(
          source,
          await readSnapshot(client, copy.fileId, copy.nodeId),
          copy,
        ),
      );
    }
  }
  return plans;
}

export async function syncRegistry(
  client: PaperClient,
  path: string,
  apply: boolean,
  runDirectory: string,
): Promise<void> {
  const registry = await loadRegistry(path);
  const plans = await buildPlans(client, registry);
  await saveJson(join(runDirectory, 'plan.json'), plans.map(summarize));
  await saveJson(join(runDirectory, 'details.json'), plans);
  console.log(
    `${plans.length} registered copies; ${plans.filter(hasChanges).length} need changes. Report: ${runDirectory}`,
  );
  if (!apply) return;
  await saveJson(join(runDirectory, 'before.json'), { registry, plans });
  try {
    for (const plan of plans) {
      const master = await readSnapshot(
        client,
        plan.master.fileId,
        plan.master.rootId,
      );
      if (!sameSnapshot(master, plan.master))
        throw new Error(`${plan.binding.name}: master changed during sync`);
      const binding = hasChanges(plan)
        ? await applyPlan(client, plan)
        : plan.binding;
      const family = registry.families.find(
        (item) =>
          item.master.fileId === master.fileId &&
          item.master.nodeId === master.rootId,
      )!;
      family.copies = family.copies.map((copy) =>
        copy.fileId === binding.fileId && copy.nodeId === binding.nodeId
          ? binding
          : copy,
      );
      await saveJson(path, registry);
      await saveJson(join(runDirectory, 'progress.json'), registry);
      console.log(JSON.stringify(summarize(plan)));
    }
  } finally {
    for (const fileId of new Set(plans.map((plan) => plan.before.fileId)))
      await client.call('finish_working_on_nodes', { fileId });
  }
}
