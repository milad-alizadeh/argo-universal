import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PluginCapability } from '@repo/contracts/plugins';
import { session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { emptySessionInput, startAcpEngine } from './acp-engine';
import { shippedFolder, writePlugin } from './runtime-plugins';

const archive = {
  name: 'archive',
  label: 'Archive',
  description: 'Archives a Session through the Plugin API.',
  tier: 'act' as const,
  params: {
    sessionId: {
      type: 'string' as const,
      description: 'The Session',
      required: true,
    },
  },
};

const source = `export function register(argo) {
  argo.operations.register('archive', async ({ sessionId }) => {
    await argo.sessions.archive(sessionId);
    return { archived: sessionId };
  });
}`;

export const canArchive: PluginCapability[] = [{ kind: 'sessions:archive' }];

export type Host = Awaited<ReturnType<typeof startAcpEngine>>;

const install = async (
  home: string,
  capabilities: PluginCapability[],
): Promise<void> => {
  await writePlugin(home, {
    id: 'tidy',
    fixture: 'healthy',
    capabilities,
    operations: [archive],
  });
  await writeFile(join(home, shippedFolder, 'tidy', 'index.mjs'), source);
};

// A first-party Plugin whose one Operation archives the Session it is handed.
export const startWith = (
  capabilities: PluginCapability[],
  scenario: Parameters<typeof startAcpEngine>[0] = { steps: [] },
): Promise<Host> =>
  startAcpEngine({
    ...scenario,
    installPlugins: (home) => install(home, capabilities),
  });

export const archiveFor = async (
  host: Host,
  sessionId: string,
  projectId = emptySessionInput.projectId,
): ReturnType<Host['caller']['plugins']['run']> => {
  await host.caller.plugin.activate({ pluginId: 'tidy' });

  return host.caller.plugins.run({
    pluginId: 'tidy',
    operation: 'archive',
    args: { sessionId },
    projectId,
  });
};

export const archivedAt = (
  host: Host,
  sessionId: string,
): number | null | undefined =>
  host.database.select().from(session).where(eq(session.id, sessionId)).get()
    ?.archivedAt;

export const pluginLog = (host: Host): Promise<string> =>
  readFile(join(host.home, 'logs/plugins.log'), 'utf8');
