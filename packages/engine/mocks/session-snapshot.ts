import type { SessionSnapshot } from '@repo/contracts';
import { onTestFinished } from 'vitest';
import { createActor, waitFor } from 'xstate';
import { createSessionSnapshotWatcher } from '../src/sessions';
import { writerMachine, type WriterJob } from '../src/storage';
import { openTestDatabase } from './database';

type SnapshotWatch = ReturnType<typeof createSessionSnapshotWatcher>;

interface WatchedSnapshots {
  snapshots: SessionSnapshot[];
  errors: unknown[];
}

type SnapshotHost = ReturnType<typeof openTestDatabase> & {
  writer: ReturnType<typeof startWriter>;
  sources: Parameters<typeof createSessionSnapshotWatcher>[0];
  write: (job: WriterJob) => void;
  watch: (sessionId: string) => WatchedSnapshots;
  failWrites: (table: string) => Promise<void>;
};

// `project-1` and its closed Session `session-1` on a real database and Writer; no Session or Feed actor is open.
export function startSnapshotHost(): SnapshotHost {
  const storage = openTestDatabase();
  onTestFinished(storage.remove);
  const writer = startWriter(storage.database);

  return makeSnapshotHost(storage, writer);
}

const makeSnapshotHost = (
  storage: ReturnType<typeof openTestDatabase>,
  writer: ReturnType<typeof startWriter>,
): SnapshotHost => {
  const sources = snapshotSources(storage.database, writer);
  const watchSnapshot = createSessionSnapshotWatcher(sources);

  return {
    ...storage,
    writer,
    sources,
    ...snapshotOperations(storage, writer, watchSnapshot),
  };
};

const snapshotOperations = (
  storage: ReturnType<typeof openTestDatabase>,
  writer: ReturnType<typeof startWriter>,
  watchSnapshot: SnapshotWatch,
): Pick<SnapshotHost, 'write' | 'watch' | 'failWrites'> => ({
  write: (job): void => writer.send({ type: 'writer.write', job }),
  watch: (sessionId): WatchedSnapshots =>
    watchSnapshots(watchSnapshot, sessionId),
  failWrites: (table): Promise<void> =>
    failWrites(storage.database, writer, table),
});

const snapshotSources = (
  database: ReturnType<typeof openTestDatabase>['database'],
  writer: ReturnType<typeof startWriter>,
): SnapshotHost['sources'] => ({
  database,
  findFeed: (): undefined => undefined,
  findWriter: (): typeof writer => writer,
  findSession: (): undefined => undefined,
});

const failWrites = async (
  database: ReturnType<typeof openTestDatabase>['database'],
  writer: ReturnType<typeof startWriter>,
  table: string,
): Promise<void> => {
  for (const write of ['INSERT', 'UPDATE'])
    database.$client.exec(
      `CREATE TEMP TRIGGER fail_${write}_${table} BEFORE ${write} ON ${table} BEGIN SELECT RAISE(FAIL, 'storage failing'); END`,
    );
  await waitFor(writer, (snapshot) => snapshot.matches('waitingToRetry'));
};

function startWriter(
  database: ReturnType<typeof openTestDatabase>['database'],
): ReturnType<typeof createActor<typeof writerMachine>> {
  const writer = createActor(writerMachine, {
    input: { database, now: () => 1000, log: () => {} },
  }).start();

  onTestFinished(() => {
    writer.stop();
  });

  return writer;
}

function watchSnapshots(
  watch: SnapshotWatch,
  sessionId: string,
): WatchedSnapshots {
  const observed: WatchedSnapshots = { snapshots: [], errors: [] };

  const subscription = watch(sessionId, {
    next: (event): void => observeSnapshot(observed, event),
    error: (error): void => {
      observed.errors.push(error);
    },
  });

  onTestFinished(() => subscription.unsubscribe());

  return observed;
}

const observeSnapshot = (
  observed: WatchedSnapshots,
  event: Parameters<NonNullable<Parameters<SnapshotWatch>[1]['next']>>[0],
): void => {
  if (event.type === 'snapshot') observed.snapshots.push(event.snapshot);
};
