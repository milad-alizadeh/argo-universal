import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PluginList } from '@repo/contracts/plugins';
import { z } from 'zod';
import { discoverPlugins } from '../discovery/loader';
import type { PluginServiceDeps } from '../located-plugins';
import type { PluginAccounts } from './plugin-accounts';

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
  const accounts = deps.pluginAccounts;

  if (!accounts) return;
  const present = await presentPlugins(discovered);

  if (!present) return;

  await Promise.all(
    recorded.flatMap((id) =>
      present.has(id) ? [] : [removePlugin(deps, accounts, id)],
    ),
  );
}

function recordedPlugins(accounts?: PluginAccounts): string[] {
  if (!accounts) return [];

  return [
    ...new Set([
      ...accounts.list().map(({ providedBy }) => providedBy),
      ...accounts.grants().map(({ plugin }) => plugin),
    ]),
  ];
}

async function removePlugin(
  deps: PluginServiceDeps,
  accounts: PluginAccounts,
  id: string,
): Promise<void> {
  await deps.pluginRuntime?.deactivate(id);
  await accounts.removePlugin(id);
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
