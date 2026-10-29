import { randomUUID } from 'node:crypto';
import { expect, it, onTestFinished, vi } from 'vitest';
import { createActor, waitFor } from 'xstate';
import { coreOnlyHooks } from '#mocks/core-hooks';
import { openTestDatabase } from '#mocks/database';
import { unlaunchedInstalledAgents } from '#mocks/installed-agents';
import { createAcpResources } from '../../../agents';
import { writerMachine } from '../../../storage';
import { openSessionsMachine } from '../../open-sessions-machine';
import { SessionRowUpdateJob } from '../../session-storage/session-storage';
import { createSessionListReader } from './reader';

const writeEvent = 'writer.write';

it('rejects a malformed stored Session before a pending patch can replace its invalid value', async (): Promise<void> => {
  const { database, directory, remove } = openTestDatabase();
  onTestFinished(remove);
  database.$client.exec(
    "UPDATE session SET title_source = 'unrecognised'; CREATE TRIGGER reject_patch BEFORE UPDATE ON session BEGIN SELECT RAISE(ABORT, 'locked'); END",
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

  const report = vi.spyOn(console, 'error').mockImplementation(() => {});

  const reader = createSessionListReader({
    database,
    sessions,
    writer: () => writer,
  });

  writer.send({
    type: writeEvent,
    job: new SessionRowUpdateJob({
      id: 'session-1',
      set: { titleSource: 'agent' },
    }),
  });
  await waitFor(writer, (snapshot) => snapshot.matches('waitingToRetry'));
  expect(reader.readRows(['session-1'])).toEqual([]);
  expect(report).toHaveBeenCalledTimes(1);
  database.$client.exec('DROP TRIGGER reject_patch');
  writer.send({ type: 'writer.drain' });
  await waitFor(writer, (snapshot) => snapshot.status === 'done');
});
