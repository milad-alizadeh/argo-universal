import { randomUUID } from 'node:crypto';
import { expect, it, onTestFinished } from 'vitest';
import { createActor, waitFor } from 'xstate';
import { coreOnlyHooks } from '#mocks/core-hooks';
import { insertSession, openTestDatabase } from '#mocks/database';
import { unlaunchedInstalledAgents } from '#mocks/installed-agents';
import { createAcpResources } from '../agents';
import { writerMachine } from '../storage';
import { openSessionsMachine } from './open-sessions-machine';
import { createSessionDirectory } from './session-directory';
import { createSessionReader } from './session-record';
import { SessionInsertJob } from './session-storage/session-storage';

const notFound = expect.objectContaining({ code: 'NOT_FOUND' });

// The Writer keeps a started Session's insert queued, as it does until the commit lands.
async function queuedStart(): Promise<
  Parameters<typeof createSessionDirectory>[0]
> {
  const { database, directory, remove } = openTestDatabase();
  onTestFinished(remove);
  insertSession(database, { id: 'caller' });
  database.$client.exec(
    "CREATE TRIGGER hold_session BEFORE INSERT ON session BEGIN SELECT RAISE(ABORT, 'database is locked'); END",
  );

  const writer = createActor(writerMachine, {
    input: { database, now: () => 1000, log: () => {} },
  }).start();

  onTestFinished(() => {
    writer.stop();
  });

  const sessions = createActor(openSessionsMachine, {
    input: {
      now: () => 1000,
      createId: randomUUID,
      hooks: coreOnlyHooks,
      database,
      runtimeDirectory: directory,
      acpResources: createAcpResources(),
      installedAgents: unlaunchedInstalledAgents(database, directory),
      writer,
    },
  });

  writer.send({
    type: 'writer.write',
    job: new SessionInsertJob({
      session: {
        id: 'started',
        projectId: 'project-1',
        agent: 'mock',
        checkoutPath: '/project',
        startedBySessionId: 'caller',
        projectionVersion: 1,
      },
    }),
  });
  await waitFor(writer, (snapshot) => snapshot.matches('waitingToRetry'));

  return { database, findWriter: () => writer, sessions };
}

it('reads a Session whose row the Writer has queued but not committed, which the stored reader misses', async () => {
  const sources = await queuedStart();
  const directory = createSessionDirectory(sources);

  expect(directory.session('started')).toEqual({
    projectId: 'project-1',
    startedBySessionId: 'caller',
  });
  expect(directory.opening('started')).toEqual(directory.session('started'));
  expect(() => createSessionReader(sources.database)('started')).toThrow(
    notFound,
  );
  expect(() => directory.session('missing')).toThrow(notFound);
  expect(() => directory.opening('missing')).toThrow(notFound);
});
