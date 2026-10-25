import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PluginList } from '@repo/contracts/plugins';
import { z } from 'zod';
import { discoverPlugins } from '../discovery/loader';
import type { PluginServiceDeps, ServiceAccounts } from '../located-plugins';

export async function discoverWithAccounts(
  deps: PluginServiceDeps,
): Promise<PluginList> {
  // Snapshot before discovery yields: startup reads must finish before the Server becomes ready.
  const recorded = recordedPlugins(deps.pluginAccounts);
  const result = await discoverPlugins(deps);
  await reconcileAccounts(deps, result, recorded);

  return result;
}

// Keep identifiable but invalid Plugins; unrelated discovery failures do not hide removal.
async function reconcileAccounts(
  deps: PluginServiceDeps,
  discovered: PluginList,
  recorded: readonly string[],
): Promise<void> {
  const present = await presentPlugins(discovered);

  if (!present) return;

  await Promise.all(
    recorded.flatMap((id) => (present.has(id) ? [] : [removePlugin(deps, id)])),
  );
}

function recordedPlugins(accounts: ServiceAccounts): string[] {
  return [
    ...new Set([
      ...accounts.list().map(({ providedBy }) => providedBy),
      ...accounts.grants().map(({ plugin }) => plugin),
    ]),
  ];
}

async function removePlugin(
  deps: PluginServiceDeps,
  id: string,
): Promise<void> {
  await deps.pluginRuntime.deactivate(id);
  await deps.pluginAccounts.removePlugin(id);
}

const ManifestIdentity = z.object({ id: z.string().min(1) });

async function presentInError(
  error: PluginList['errors'][number],
): Promise<string | null> {
  try {
    const source = await readFile(join(error.directory, 'plugin.json'), 'utf8');

    return ManifestIdentity.parse(JSON.parse(source)).id;
  } catch {
    // An unreadable directory or identity cannot establish which Plugin remains.
    return null;
  }
}

async function presentPlugins(
  discovered: PluginList,
): Promise<Set<string> | null> {
  const failed = await Promise.all(discovered.errors.map(presentInError));

  if (failed.includes(null)) return null;

  return new Set([
    ...discovered.plugins.map(({ manifest }) => manifest.id),
    ...failed.filter((id) => id !== null),
  ]);
}
