import { onTestFinished, vi } from 'vitest';
import {
  countDatabaseReads,
  insertEndedTurn,
  openTestDatabase,
} from './database';
import { startEngineTestHost } from './engine';
import { watchEngineList } from './list-observation';
import { scriptedEngineInput } from './scripted-engine';

type EngineHost = Awaited<ReturnType<typeof startEngineTestHost>>;

type ListIterator = ReturnType<
  Awaited<
    ReturnType<EngineHost['caller']['session']['listUpdates']>
  >[typeof Symbol.asyncIterator]
>;

type CountsIterator = ReturnType<
  Awaited<
    ReturnType<EngineHost['caller']['session']['counts']>
  >[typeof Symbol.asyncIterator]
>;

type Watcher = ReturnType<typeof watchEngineList>;

type ListReaders = {
  writer: EngineHost['databaseWriter'];
  counted: ReturnType<typeof countDatabaseReads>;
  first: ListIterator;
  second: ListIterator;
  counts: CountsIterator;
  secondWatcher: Watcher;
  countsWatcher: Watcher;
  resumedWatcher: Watcher;
};

type ListWatchers = {
  firstWatcher: Watcher;
  secondWatcher: Watcher;
  countsWatcher: Watcher;
  resumedWatcher: Watcher;
};

export async function startListReaders(): Promise<ListReaders> {
  const { database, remove } = openTestDatabase();
  insertEndedTurn(database);
  onTestFinished(remove);

  const host = await startEngineTestHost({
    database,
    ...scriptedEngineInput(),
  });

  const watchers = createListWatchers(host);

  vi.useFakeTimers();
  onTestFinished((): void => {
    vi.useRealTimers();
  });

  return subscribeReaders(host, watchers);
}

const createListWatchers = (host: EngineHost): ListWatchers => ({
  firstWatcher: watchEngineList(host.createCaller),
  secondWatcher: watchEngineList(host.createCaller),
  countsWatcher: watchEngineList(host.createCaller),
  resumedWatcher: watchEngineList(host.createCaller),
});

async function subscribeReaders(
  host: EngineHost,
  watchers: ListWatchers,
): Promise<ListReaders> {
  const { firstWatcher, secondWatcher, countsWatcher } = watchers;
  const counted = countDatabaseReads(host.database);

  return {
    ...watchers,
    writer: host.databaseWriter,
    counted,
    first: await iterate(firstWatcher.caller.session.listUpdates()),
    second: await iterate(secondWatcher.caller.session.listUpdates()),
    counts: await iterate(countsWatcher.caller.session.counts()),
  };
}

async function iterate<T>(
  stream: Promise<AsyncIterable<T>>,
): Promise<AsyncIterator<T>> {
  return (await stream)[Symbol.asyncIterator]();
}
