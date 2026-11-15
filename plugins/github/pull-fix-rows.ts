import type { Argo, StorageResult } from '@argo/plugin-kit';
import type { PullReference } from './pull-reference';

export type Statement = Parameters<Argo['storage']['execute']>[0];

export type Execute = (statement: Statement) => Promise<StorageResult>;

type Param = string | number | null;

export type Link = PullReference & { projectId: string; sessionId: string };

// What Auto-fix keeps of one pull request of one Session: whether it is on, and the commit it stopped on.
export type FixRecord = Link & { enabled: boolean; stopHead: string | null };

export type FixStore = {
  // Every record of these Sessions.
  forSessions: (sessionIds: readonly string[]) => Promise<FixRecord[]>;
  // Every pull request of a Project that has Auto-fix on.
  enabledIn: (projectId: string) => Promise<FixRecord[]>;
  // Turns it on at once: clears the reason, starts the count again on this head, and notes the events already there.
  enable: (link: Link, head: string, keys: readonly string[]) => Promise<void>;
  disable: (link: Link) => Promise<void>;
  // Turns it off and remembers the commit it gave up on.
  stop: (link: Link, head: string) => Promise<void>;
  // The event keys already seen on this head, review comments seen on any head included, and how many Prompts Auto-fix has sent on it.
  seen: (link: Link, head: string) => Promise<ReadonlySet<string>>;
  sent: (link: Link, head: string) => Promise<number>;
  record: (link: Link, head: string, key: string) => Promise<void>;
  unrecord: (link: Link, head: string, key: string) => Promise<void>;
  // Everything kept for a detached pull request.
  forget: (link: Link) => Promise<void>;
};

/*
 * One row per Session per pull request the person has turned Auto-fix on for. `stop_head` is the head commit it gave up
 * on, so the reason is told only while that commit is still the head. The events table holds each event per head commit
 * it was seen on (`check:<name>`, `conflict` or `comment:<id>`, see `pull-fix-prompts.ts`): `sent` is 1 for a Prompt
 * Auto-fix sent and 0 for an event already there when it was turned on, which is never prompted and never counted.
 */
export const tables = [
  'CREATE TABLE IF NOT EXISTS pull_auto_fix (project_id TEXT NOT NULL, session_id TEXT NOT NULL, repository TEXT NOT NULL, number INTEGER NOT NULL, enabled INTEGER NOT NULL, stop_head TEXT, PRIMARY KEY (project_id, session_id, repository, number))',
  'CREATE TABLE IF NOT EXISTS pull_auto_fix_events (project_id TEXT NOT NULL, session_id TEXT NOT NULL, repository TEXT NOT NULL, number INTEGER NOT NULL, head TEXT NOT NULL, event_key TEXT NOT NULL, sent INTEGER NOT NULL, PRIMARY KEY (project_id, session_id, repository, number, head, event_key))',
];

export const columns =
  'project_id, session_id, repository, number, enabled, stop_head';

export const where =
  'project_id = ? AND session_id = ? AND repository = ? AND number = ?';

/*
 * An event's key in the events table. A failed Check and a conflict belong to the head commit they were seen on; a
 * review comment is keyed by its id alone and is seen on every head, so a push never prompts it again.
 */
export const checkKey = (check: string): string => `check:${check}`;

export const commentPrefix = 'comment:';

export const commentKey = (id: number): string => `${commentPrefix}${id}`;

export const conflictKey = 'conflict';

export const keyOf = (link: Link): Param[] => [
  link.projectId,
  link.sessionId,
  link.repository.toLowerCase(),
  link.number,
];

export const run = (sql: string, params: Param[]): Statement => ({
  sql,
  params,
  method: 'run',
});

export const all = (sql: string, params: Param[]): Statement => ({
  sql,
  params,
  method: 'all',
});

type Row = [string, string, string, number, number, string | null];

const rowWidth = 6;

const numberColumn = 3;

const isRecord = (row: unknown): row is Row =>
  Array.isArray(row) &&
  row.length === rowWidth &&
  typeof row[numberColumn] === 'number';

const recordOf = ([
  projectId,
  sessionId,
  repository,
  number,
  enabled,
  stopHead,
]: Row): FixRecord => ({
  projectId,
  sessionId,
  repository,
  number,
  enabled: enabled === 1,
  stopHead,
});

export const recordsOf = ({ rows }: StorageResult): FixRecord[] =>
  rows.filter(isRecord).map(recordOf);

type NameRow = [string];

type CountRow = [number];

export const isNameRow = (row: unknown): row is NameRow =>
  Array.isArray(row) && row.length === 1 && typeof row[0] === 'string';

export const isCountRow = (row: unknown): row is CountRow =>
  Array.isArray(row) && row.length === 1 && typeof row[0] === 'number';
