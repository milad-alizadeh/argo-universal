import type { PromptRequest } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { promptedArchiveSession } from '#mocks/archive';
import { insertSession } from '#mocks/database';
import {
  archiveFor,
  archivedAt,
  canArchive,
  pluginLog,
  startWith,
} from '#mocks/plugin-archive-host';

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
