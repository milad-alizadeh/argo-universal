import { comparisonBase, type ChangesSelection } from './comparison';
import { trackedFiles, untrackedPaths, type CheckoutFile } from './parse';
import { readNameStatus, readNumstat, readWorktree } from './status';

// The list asks for every file in view at once; this is how long a read waits for the rest of them.
const joinWindowMs = 5;

type Read<Value> = () => Promise<Value>;

const afterJoinWindow = <Value>(
  key: string,
  waiting: Map<string, Promise<Value>>,
  read: Read<Value>,
): Promise<Value> =>
  new Promise((resolve) => {
    setTimeout(() => {
      waiting.delete(key);
      resolve(read());
    }, joinWindowMs);
  });

/*
 * Reads asked for together share one, and it starts only once the window closes. A read that has started takes no one
 * else, so an answer never predates its question: a file changed just before a refresh is always seen.
 */
function joinedReads<Value>(): (
  key: string,
  read: Read<Value>,
) => Promise<Value> {
  const waiting = new Map<string, Promise<Value>>();

  return (key, read) => {
    const joined = waiting.get(key) ?? afterJoinWindow(key, waiting, read);

    waiting.set(key, joined);

    return joined;
  };
}

const joinUntracked = joinedReads<ReadonlySet<string>>();

const joinTracked = joinedReads<TrackedChanges>();

// The Checkout's untracked files; these answer before any base is resolved.
export const readUntrackedPaths = (
  checkout: string,
): Promise<ReadonlySet<string>> =>
  joinUntracked(
    checkout,
    async () => new Set(untrackedPaths(await readWorktree(checkout))),
  );

// The comparison's tracked files by path, with the commit they were compared from; renames are paired across all of them.
export type TrackedChanges = {
  base: string;
  files: ReadonlyMap<string, CheckoutFile>;
};

async function readTrackedChanges(
  selection: ChangesSelection,
): Promise<TrackedChanges> {
  const { base } = await comparisonBase(selection);

  const [status, numstat] = await Promise.all([
    readNameStatus(selection.checkout, base),
    readNumstat(selection.checkout, base),
  ]);

  const files = trackedFiles(status, numstat);

  return { base, files: new Map(files.map((file) => [file.path, file])) };
}

export const readTrackedComparison = (
  selection: ChangesSelection,
): Promise<TrackedChanges> =>
  joinTracked(
    JSON.stringify([
      selection.checkout,
      selection.projectCheckout,
      selection.comparison,
    ]),
    () => readTrackedChanges(selection),
  );
