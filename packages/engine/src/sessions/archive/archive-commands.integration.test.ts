import { scriptedInitialization } from '@repo/mocks/agent/scripted-scenario';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { promptedArchiveSession } from '#mocks/archive';
import { insertSession } from '#mocks/database';
import { sessionSources } from '#mocks/session-sources';
import { OpenSessions } from '../open-sessions';
import { archiveSession, unarchiveSession } from './archive-commands';

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

const operationDeps = (host: Host): OpenSessions =>
  new OpenSessions(sessionSources(host.openSessions));

it('refuses to archive a child Session', async () => {
  const host = await startAcpEngine({ steps: [] });
  const created = await promptedArchiveSession(host);
  insertSession(host.database, {
    id: 'child',
    parentSessionId: created.sessionId,
    checkoutPath: created.path,
  });

  await expect(
    archiveSession(operationDeps(host), 'child'),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
});

it('refuses to archive a Session that is already archived', async () => {
  const host = await startAcpEngine({ steps: [] });
  const created = await promptedArchiveSession(host);
  const deps = operationDeps(host);
  await archiveSession(deps, created.sessionId);

  await expect(archiveSession(deps, created.sessionId)).rejects.toMatchObject({
    code: 'CONFLICT',
  });
});

it('acknowledges an archive and its Undo', async () => {
  const host = await startAcpEngine({ steps: [] });
  const created = await promptedArchiveSession(host);
  const deps = operationDeps(host);

  await expect(archiveSession(deps, created.sessionId)).resolves.toEqual({});
  await expect(unarchiveSession(deps, created.sessionId)).resolves.toEqual({});
});

it('fails with TIMEOUT when the archive has not settled within the limit', async () => {
  const host = await startAcpEngine({
    steps: [],
    closeTimeoutMs: 60_000,
    initialize: {
      ...scriptedInitialization,
      agentCapabilities: { sessionCapabilities: { close: {}, resume: {} } },
    },
    responses: { 'session/close': [{ steps: [{ type: 'hold' }] }] },
  });

  const created = await promptedArchiveSession(host);

  await expect(
    archiveSession(operationDeps(host), created.sessionId, 50),
  ).rejects.toMatchObject({ code: 'TIMEOUT' });
});
