import { sql } from 'drizzle-orm';
import {
  type AnySQLiteColumn,
  index,
  integer,
  primaryKey,
  snakeCase,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// Table definitions only: no Node APIs, so contracts and the Apps can import this file.

export const sessionUpdateKinds = [
  'user_message',
  'agent_message',
  'agent_thought',
  'tool_call_update',
  'plan_update',
  'compaction_update',
  'subagent_update',
  'notice',
  'task_update',
] as const;
export type SessionUpdateKind = (typeof sessionUpdateKinds)[number];

export const sessionUpdateStates = ['open', 'settled'] as const;
export type SessionUpdateState = (typeof sessionUpdateStates)[number];

export const turnStatuses = ['running', 'ended'] as const;
export type TurnStatus = (typeof turnStatuses)[number];

export const stopReasons = [
  'end_turn',
  'max_tokens',
  'max_turn_requests',
  'refusal',
  'cancelled',
  'error',
] as const;
export type StopReason = (typeof stopReasons)[number];

// Times are Unix milliseconds. JSON columns are text; the Server validates them on write and read.
// The database stamps `createdAt` and `startedAt` on insert, and a trigger stamps `updatedAt` on update (migration `updated_at_triggers`).
const now = sql`(cast(unixepoch('subsec') * 1000 as integer))`;
const timestamp = () => integer().notNull().default(now);

export const project = snakeCase.table('project', {
  id: text().primaryKey(),
  path: text().notNull().unique(),
  name: text().notNull(),
  // The New Session checkout the user chose last, as JSON; null until the first Session.
  checkoutChoice: text({ mode: 'json' }),
  createdAt: timestamp(),
});

export const sessionTitleSources = ['user', 'agent', 'prompt'] as const;

export const session = snakeCase.table('session', {
  id: text().primaryKey(),
  projectId: text()
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),
  agent: text().notNull(),
  title: text().notNull().default(''),
  titleSource: text({ enum: sessionTitleSources }).notNull().default('prompt'),
  archivedAt: integer(),
  seenRevision: integer().notNull().default(0),
  activityAt: integer().notNull().default(0),
  failure: text(),
  vendorSessionId: text(),
  parentSessionId: text().references((): AnySQLiteColumn => session.id, {
    onDelete: 'set null',
  }),
  checkoutPath: text().notNull(),
  checkoutBranch: text(),
  vendorRef: text({ mode: 'json' }),
  // The config values the Session last ran with, as JSON, so a resume keeps its model and mode.
  configValues: text({ mode: 'json' }).notNull().default(sql`'[]'`),
  epoch: integer().notNull().default(0),
  projectionVersion: integer().notNull(),
  maxRevision: integer().notNull().default(0),
  createdAt: timestamp(),
  updatedAt: timestamp(),
});

export const turn = snakeCase.table(
  'turn',
  {
    id: text().primaryKey(),
    sessionId: text()
      .notNull()
      .references(() => session.id, { onDelete: 'cascade' }),
    status: text({ enum: turnStatuses }).notNull(),
    stopReason: text({ enum: stopReasons }),
    error: text({ mode: 'json' }),
    usage: text({ mode: 'json' }),
    model: text(),
    startedAt: timestamp(),
    endedAt: integer(),
  },
  (table) => [
    index('turn_session_id_started_at_index').on(
      table.sessionId,
      table.startedAt,
    ),
  ],
);

export const feedRow = snakeCase.table(
  'feed_row',
  {
    sessionId: text()
      .notNull()
      .references(() => session.id, { onDelete: 'cascade' }),
    position: integer().notNull(),
    id: text().notNull(),
    sessionUpdate: text({ enum: sessionUpdateKinds }).notNull(),
    revision: integer().notNull(),
    turnId: text(),
    state: text({ enum: sessionUpdateStates }).notNull(),
    payload: text({ mode: 'json' }).notNull(),
    payloadVersion: integer().notNull(),
    sourceRef: text({ mode: 'json' }),
    searchText: text(),
    createdAt: timestamp(),
    updatedAt: timestamp(),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.position] }),
    uniqueIndex('feed_row_session_id_id_unique').on(table.sessionId, table.id),
    index('feed_row_session_id_revision_index').on(
      table.sessionId,
      table.revision,
    ),
    index('feed_row_session_id_session_update_position_index').on(
      table.sessionId,
      table.sessionUpdate,
      table.position,
    ),
  ],
);

// `id` is the sha256 of the file in `~/.argo/blobs/` (ADR-0005).
export const blob = snakeCase.table('blob', {
  id: text().primaryKey(),
  mime: text().notNull(),
  bytes: integer().notNull(),
  width: integer(),
  height: integer(),
  createdAt: timestamp(),
});

// A deleted Session takes its refs with it; the Server deletes blob files that have no ref left.
export const blobRef = snakeCase.table(
  'blob_ref',
  {
    blobId: text()
      .notNull()
      .references(() => blob.id),
    sessionId: text()
      .notNull()
      .references(() => session.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.blobId, table.sessionId] })],
);
