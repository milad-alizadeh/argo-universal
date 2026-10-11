import { expect, it, onTestFinished } from 'vitest';
import { createActor, waitFor } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import { SqlJob } from '#mocks/storage-job';
import { writerMachine } from './writer-machine';

const writeEvent = 'writer.write';
const setTitle = (title: string): SqlJob =>
  new SqlJob({ statement: `UPDATE session SET title = '${title}'` });
const insertTurn = new SqlJob({
  statement:
    "INSERT INTO turn (id, session_id, status) VALUES ('turn-1', 'session-1', 'running')",
});
const startWriter = (): ReturnType<typeof openTestDatabase> & {
  writer: ReturnType<typeof createActor<typeof writerMachine>>;
} => {
  const storage = openTestDatabase();
  const writer = createActor(writerMachine, {
    input: { database: storage.database, now: () => 1000, log: () => {} },
  }).start();
  onTestFinished(() => {
    writer.stop();
    storage.remove();
  });
  return { ...storage, writer };
};

it('a Writer acknowledgement follows the durable ordered prefix', async () => {
  const { database, writer } = startWriter();
  const committed = Promise.withResolvers<void>();
  writer.send({
    type: writeEvent,
    job: setTitle('saved'),
  });
  writer.send({
    type: writeEvent,
    job: insertTurn,
    committed,
  });
  await committed.promise;
  expect(database.$client.prepare('SELECT title FROM session').get()).toEqual({
    title: 'saved',
  });
  expect(database.$client.prepare('SELECT id, status FROM turn').get()).toEqual(
    { id: 'turn-1', status: 'running' },
  );
});

it('a failed prefix permanently rejects a receipt behind it while durable jobs still retry', async () => {
  const { database, writer } = startWriter();
  database.$client.exec(
    "CREATE TRIGGER reject_session BEFORE UPDATE ON session BEGIN SELECT RAISE(FAIL, 'storage unavailable'); END",
  );
  const committed = Promise.withResolvers<void>();
  const outcome = committed.promise.then(
    () => 'committed',
    () => 'rejected',
  );
  writer.send({
    type: writeEvent,
    job: setTitle('saved later'),
  });
  writer.send({
    type: writeEvent,
    job: insertTurn,
    committed,
  });
  expect(await outcome).toBe('rejected');
  database.$client.exec('DROP TRIGGER reject_session');
  writer.send({ type: 'writer.drain' });
  await waitFor(writer, (snapshot) => snapshot.status === 'done');
  expect(database.$client.prepare('SELECT id FROM turn').get()).toEqual({
    id: 'turn-1',
  });
  expect(await outcome).toBe('rejected');
});

it('a receipt arriving while the Writer retries rejects without waiting for another attempt', async () => {
  const { database, writer } = startWriter();
  database.$client.exec(
    "CREATE TRIGGER reject_session BEFORE UPDATE ON session BEGIN SELECT RAISE(FAIL, 'storage unavailable'); END",
  );
  writer.send({
    type: writeEvent,
    job: setTitle('blocked'),
  });
  await waitFor(writer, (snapshot) => snapshot.matches('waitingToRetry'));
  const outcomes: string[] = [];
  writer.send({
    type: writeEvent,
    job: new SqlJob({ statement: "UPDATE turn SET status = 'ended'" }),
    committed: {
      resolve: () => {
        outcomes.push('committed');
      },
      reject: () => {
        outcomes.push('rejected');
      },
    },
  });
  expect(outcomes).toEqual(['rejected']);
});
