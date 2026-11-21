import { sql } from 'drizzle-orm';
import {
  type AnySQLiteColumn,
  type IndexBuilder,
  index,
  integer,
  snakeCase,
  text,
} from 'drizzle-orm/sqlite-core';
import { project } from '#schema-projects';
import { timestamp } from '#schema-timestamp';

export const turnStatuses = ['running', 'ended'] as const;

export const stopReasons = [
  'end_turn',
  'max_tokens',
  'max_turn_requests',
  'refusal',
  'cancelled',
  'error',
  'auth_required',
] as const;

export const sessionTitleSources = ['user', 'agent', 'prompt'] as const;

export const session = snakeCase.table(
  'session',
  {
    id: text().primaryKey(),
    projectId: text()
      .notNull()
      .references((): typeof project.id => project.id, { onDelete: 'cascade' }),
    agent: text().notNull(),
    title: text().notNull().default(''),
    titleSource: text({ enum: sessionTitleSources })
      .notNull()
      .default('prompt'),
    archivedAt: integer(),
    // The Project's archive setting when this Session was archived, so changing it later never removes a kept worktree.
    keepCheckout: integer({ mode: 'boolean' }).notNull().default(false),
    seenRevision: integer().notNull().default(0),
    activityAt: integer().notNull().default(0),
    failure: text(),
    vendorSessionId: text(),
    parentSessionId: text().references((): AnySQLiteColumn => session.id, {
      onDelete: 'set null',
    }),
    // Operation provenance is writable; ACP's parentSessionId remains read-only.
    startedBySessionId: text().references((): AnySQLiteColumn => session.id, {
      onDelete: 'set null',
    }),
    checkoutPath: text().notNull(),
    checkoutBranch: text(),
    checkoutType: text({ enum: ['worktree', 'main', 'starter'] }),
    vendorRef: text({ mode: 'json' }),
    // The config values the Session last ran with, as JSON, so a resume keeps its model and mode.
    configValues: text({ mode: 'json' })
      .notNull()
      .default(sql`'[]'`),
    promptQueue: text({ mode: 'json' })
      .notNull()
      .default(sql`'{"items":[],"pauseReason":null}'`),
    heldConfig: text({ mode: 'json' })
      .notNull()
      .default(sql`'[]'`),
    epoch: integer().notNull().default(0),
    projectionVersion: integer().notNull(),
    maxRevision: integer().notNull().default(0),
    createdAt: timestamp(),
    updatedAt: timestamp(),
  },
  ({ parentSessionId, startedBySessionId }): IndexBuilder[] => [
    index('session_parent_session_id_index').on(parentSessionId),
    index('session_started_by_session_id_index').on(startedBySessionId),
  ],
);

export const turn = snakeCase.table(
  'turn',
  {
    id: text().primaryKey(),
    sessionId: text()
      .notNull()
      .references((): typeof session.id => session.id, { onDelete: 'cascade' }),
    status: text({ enum: turnStatuses }).notNull(),
    stopReason: text({ enum: stopReasons }),
    error: text({ mode: 'json' }),
    usage: text({ mode: 'json' }),
    model: text(),
    startedAt: timestamp(),
    endedAt: integer(),
  },
  ({ sessionId, startedAt }): IndexBuilder[] => [
    index('turn_session_id_started_at_index').on(sessionId, startedAt),
  ],
);

export const sessionSchedule = snakeCase.table(
  'session_schedule',
  {
    id: text().primaryKey(),
    sessionId: text()
      .notNull()
      .references(() => session.id, { onDelete: 'cascade' }),
    prompt: text().notNull(),
    intervalSeconds: integer().notNull(),
    nextAt: integer().notNull(),
    lastQueuedAt: integer(),
    paused: integer({ mode: 'boolean' }).notNull().default(false),
  },
  (row) => [index('session_schedule_due').on(row.paused, row.nextAt)],
);

// A Started Session's explicitly delegated Turn and its delivery receipt.
export const delegatedTurn = snakeCase.table(
  'delegated_turn',
  {
    id: text().primaryKey(),
    starterId: text()
      .notNull()
      .references(() => session.id, { onDelete: 'cascade' }),
    sourceId: text()
      .notNull()
      .references(() => session.id, { onDelete: 'cascade' }),
    turnId: text().notNull(),
    delivered: integer({ mode: 'boolean' }).notNull().default(false),
    revoked: integer({ mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    index('delegated_turn_pending_index').on(table.delivered, table.revoked),
    index('delegated_turn_starter_index').on(table.starterId),
  ],
);

// A closed starter Turn cannot admit another delegated result, even when its Prompt was queued.
export const closedFollowThrough = snakeCase.table('closed_follow_through', {
  turnId: text()
    .primaryKey()
    .references(() => turn.id, { onDelete: 'cascade' }),
});

// A proposed native command waits for an explicit action in its destination Session.
export const delegatedSkill = snakeCase.table(
  'delegated_skill',
  {
    id: text().primaryKey(),
    starterId: text()
      .notNull()
      .references(() => session.id, { onDelete: 'cascade' }),
    originTurnId: text()
      .notNull()
      .references(() => turn.id, { onDelete: 'cascade' }),
    destinationId: text()
      .notNull()
      .references(() => session.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    arguments: text().notNull(),
    commandDigest: text().notNull(),
    dispatched: integer({ mode: 'boolean' }).notNull().default(false),
    skipped: integer({ mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    index('delegated_skill_destination_index').on(table.destinationId),
  ],
);
