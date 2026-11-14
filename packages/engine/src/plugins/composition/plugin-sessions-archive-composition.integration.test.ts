import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PromptRequest } from '@agentclientprotocol/sdk';
import type { PluginCapability } from '@repo/contracts/plugins';
import { session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { promptedArchiveSession } from '#mocks/archive';
import { insertSession } from '#mocks/database';
import { shippedFolder, writePlugin } from '#mocks/runtime-plugins';

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

const canArchive: PluginCapability[] = [{ kind: 'sessions:archive' }];

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

// A first-party Plugin whose one Operation archives the Session it is handed.
const startWith = (
  capabilities: PluginCapability[],
  scenario: Parameters<typeof startAcpEngine>[0] = { steps: [] },
): Promise<Host> =>
  startAcpEngine({
    ...scenario,
    installPlugins: async (home) => {
      await writePlugin(home, {
        id: 'tidy',
        fixture: 'healthy',
        capabilities,
        operations: [archive],
      });
      await writeFile(join(home, shippedFolder, 'tidy', 'index.mjs'), source);
    },
  });

const archiveFor = async (
  host: Host,
  sessionId: string,
  projectId = emptySessionInput.projectId,
): Promise<unknown> => {
  await host.caller.plugin.activate({ pluginId: 'tidy' });

  return host.caller.plugins.run({
    pluginId: 'tidy',
    operation: 'archive',
    args: { sessionId },
    projectId,
  });
};

const archivedAt = (host: Host, sessionId: string): number | null | undefined =>
  host.database.select().from(session).where(eq(session.id, sessionId)).get()
    ?.archivedAt;

const pluginLog = (host: Host): Promise<string> =>
  readFile(join(host.home, 'logs/plugins.log'), 'utf8');

it('archives an idle top-level Session and its child Sessions, as the App does', async () => {
  const host = await startWith(canArchive);
  const created = await promptedArchiveSession(host);

  insertSession(host.database, {
    id: 'child',
    parentSessionId: created.sessionId,
    checkoutPath: created.path,
  });

  await expect(archiveFor(host, created.sessionId)).resolves.toEqual({
    result: { archived: created.sessionId },
  });

  expect(archivedAt(host, created.sessionId)).toBeTypeOf('number');
  expect(archivedAt(host, 'child')).toBeTypeOf('number');
}, 20_000);

it('refuses and logs the Plugin id when the manifest does not declare sessions:archive', async () => {
  const host = await startWith([]);
  const created = await promptedArchiveSession(host);

  await expect(archiveFor(host, created.sessionId)).rejects.toThrow(
    /sessions:archive is not a declared Capability/,
  );

  expect(archivedAt(host, created.sessionId)).toBeNull();
  expect(await pluginLog(host)).toContain(
    `Plugin tidy: refused argo.sessions.archive ${created.sessionId}`,
  );
}, 20_000);

it('refuses a Session that is not in the Project the call runs for', async () => {
  const host = await startWith(canArchive);
  const created = await promptedArchiveSession(host);

  await expect(
    archiveFor(host, created.sessionId, 'another-project'),
  ).rejects.toThrow(/not in the Project/);

  expect(archivedAt(host, created.sessionId)).toBeNull();
}, 20_000);

it('refuses a Session that is not top level', async () => {
  const host = await startWith(canArchive);
  const created = await promptedArchiveSession(host);

  insertSession(host.database, {
    id: 'child',
    parentSessionId: created.sessionId,
    checkoutPath: created.path,
  });

  await expect(archiveFor(host, 'child')).rejects.toThrow(/top-level/);

  expect(archivedAt(host, 'child')).toBeNull();
  expect(archivedAt(host, created.sessionId)).toBeNull();
}, 20_000);

it('refuses, and does not queue, an archive while a Turn runs', async () => {
  const received = Promise.withResolvers<PromptRequest>();

  const host = await startWith(canArchive, {
    steps: [],
    responses: {
      'session/prompt': [{ received, steps: [{ type: 'hold' }] }],
    },
  });

  const created = await host.caller.session.new(emptySessionInput);

  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Run' }],
  });
  await received.promise;

  await expect(archiveFor(host, created.sessionId)).rejects.toThrow(
    /cannot accept session.archive/,
  );

  await host.caller.session.cancel(created);
  await new Promise((done) => setTimeout(done, 200));

  expect(archivedAt(host, created.sessionId)).toBeNull();
}, 20_000);
