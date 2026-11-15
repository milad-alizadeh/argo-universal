import type { Argo, StorageResult } from '@argo/plugin-kit';
import type { LinkRead } from './pull-changes';
import type { PullKey } from './pull-store';

type Storage = Pick<Argo, 'storage'>;

type Statement = Parameters<Argo['storage']['execute']>[0];

// What is kept of one pull request: the last good read of it and of its Checks, and why the latest read failed.
type Kept = Pick<Read, 'pull' | 'checks'>;

type Read = LinkRead<PullKey>;

/*
 * One row per pull request of a Project, shared by every Session associated with it: the last read of it, as JSON.
 * It is the one place a Slot or an Operation reads a pull request from (ADR-0052), and it survives a restart.
 */
const table =
  'CREATE TABLE IF NOT EXISTS pull_records (project_id TEXT NOT NULL, repository TEXT NOT NULL, number INTEGER NOT NULL, known TEXT NOT NULL, read_at TEXT NOT NULL, PRIMARY KEY (project_id, repository, number))';

export type PullRecords = {
  // Each pull request named with what was last read of it; one never read has nothing but its key.
  of: <Link extends PullKey>(
    links: readonly Link[],
  ) => Promise<LinkRead<Link>[]>;
  // Keeps a read over what was kept, and answers whether that changed anything.
  save: (read: Read) => Promise<boolean>;
  // Drops what was kept of a pull request no Session of its Project is associated with any more.
  forget: (link: PullKey) => Promise<void>;
};

type Key = PullKey;

const paramsOf = ({
  projectId,
  repository,
  number,
}: Key): (string | number)[] => [projectId, repository.toLowerCase(), number];

const keyOf = (key: Key): string => JSON.stringify(paramsOf(key));

const withData = <Value>(data: Value | undefined): { data?: Value } =>
  data === undefined ? {} : { data };

type Failure = NonNullable<Kept['pull']['failure']>;

const withFailure = (failure: Failure | undefined): { failure?: Failure } =>
  failure ? { failure } : {};

const lastPull = (
  kept: Kept | undefined,
  { pull }: Read,
): Kept['pull']['data'] => pull.data ?? kept?.pull.data;

// The last good read stays beside a failure, so a pull request that cannot be refreshed is never drawn as gone.
const pullOf = (kept: Kept | undefined, read: Read): Kept['pull'] => ({
  ...withData(lastPull(kept, read)),
  ...withFailure(read.pull.failure),
});

type Checks = NonNullable<Kept['checks']>;

const headOf = (kept: Kept | undefined): string | undefined =>
  kept?.pull.data?.head;

const checksDataOf = (kept: Kept | undefined): Checks['data'] =>
  kept?.checks?.data;

// A read that failed says nothing of the head, so what was kept still stands for it.
const sameHead = (kept: Kept | undefined, { pull }: Read): boolean =>
  pull.data === undefined || pull.data.head === headOf(kept);

// Checks belong to one head commit: those of an earlier head are never kept for a later one.
const keptChecks = (kept: Kept | undefined, read: Read): Checks['data'] =>
  sameHead(kept, read) ? checksDataOf(kept) : undefined;

const readChecks = (checks: Checks, before: Checks['data']): Checks => ({
  ...withData(checks.data ?? before),
  ...withFailure(checks.failure),
});

function checksOf(kept: Kept | undefined, read: Read): Kept['checks'] {
  const before = keptChecks(kept, read);

  if (read.checks) return readChecks(read.checks, before);

  return before && { data: before };
}

function merged(kept: Kept | undefined, read: Read): Kept {
  const checks = checksOf(kept, read);

  return { pull: pullOf(kept, read), ...(checks && { checks }) };
}

const parsed = (text: string | undefined): Kept | undefined => {
  if (text === undefined) return undefined;

  const kept: Kept = JSON.parse(text);

  return kept;
};

const recordColumns = 4;

const isRecordRow = (row: unknown): row is [string, string, number, string] =>
  Array.isArray(row) &&
  row.length === recordColumns &&
  Number.isSafeInteger(row[2]);

// What is kept, as text, by the key of its pull request.
const textsOf = ({ rows }: StorageResult): Map<string, string> =>
  new Map(
    rows
      .filter(isRecordRow)
      .map(([projectId, repository, number, known]) => [
        keyOf({ projectId, repository, number }),
        known,
      ]),
  );

const selectOf = (keys: readonly Key[]): Statement => ({
  sql: `SELECT project_id, repository, number, known FROM pull_records WHERE (project_id, repository, number) IN (VALUES ${keys.map(() => '(?, ?, ?)').join(', ')})`,
  params: keys.flatMap(paramsOf),
  method: 'all',
});

const upsert =
  'INSERT INTO pull_records (project_id, repository, number, known, read_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(project_id, repository, number) DO UPDATE SET known = excluded.known, read_at = excluded.read_at';

const upsertOf = (key: Key, known: string): Statement => ({
  sql: upsert,
  params: [...paramsOf(key), known, new Date().toISOString()],
  method: 'run',
});

const remove =
  'DELETE FROM pull_records WHERE project_id = ? AND repository = ? AND number = ? AND NOT EXISTS (SELECT 1 FROM pull_associations a WHERE a.project_id = pull_records.project_id AND a.repository = pull_records.repository AND a.number = pull_records.number)';

const readOf = <Link extends PullKey>(
  link: Link,
  kept: Kept | undefined,
): LinkRead<Link> => ({
  link,
  pull: {},
  ...kept,
});

type Run = (statement: Statement) => Promise<StorageResult>;

// Each statement waits for the table, then runs.
function running({ storage }: Storage): Run {
  let ready: Promise<StorageResult> | undefined;

  return async (statement) => {
    ready ??= storage.execute({ sql: table, params: [], method: 'run' });
    await ready;

    return storage.execute(statement);
  };
}

async function textsFor(
  run: Run,
  keys: readonly Key[],
): Promise<Map<string, string>> {
  return keys.length === 0 ? new Map() : textsOf(await run(selectOf(keys)));
}

async function save(run: Run, read: Read): Promise<boolean> {
  const before = (await textsFor(run, [read.link])).get(keyOf(read.link));
  const next = JSON.stringify(merged(parsed(before), read));

  if (next === before) return false;

  await run(upsertOf(read.link, next));

  return true;
}

async function readsOf<Link extends PullKey>(
  run: Run,
  links: readonly Link[],
): Promise<LinkRead<Link>[]> {
  const texts = await textsFor(run, links);

  return links.map((link) => readOf(link, parsed(texts.get(keyOf(link)))));
}

export function createPullRecords(argo: Storage): PullRecords {
  const run = running(argo);

  return {
    of: (links) => readsOf(run, links),
    save: (read) => save(run, read),
    forget: async (link) => {
      await run({ sql: remove, params: paramsOf(link), method: 'run' });
    },
  };
}
