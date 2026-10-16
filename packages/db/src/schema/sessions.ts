import { sql } from 'drizzle-orm';
import {
  type AnySQLiteColumn,
  type IndexBuilder,
  index,
  integer,
  snakeCase,
  text,
} from 'drizzle-orm/sqlite-core';
import { project } from './projects';
import { timestamp } from './timestamp';

export const turnStatuses = ['running', 'ended'] as const;

export const stopReasons = [
  'end_turn',
  'max_tokens',
  'max_turn_requests',
  'refusal',
  'cancelled',
  'error',
] as const;

export const sessionTitleSources = ['user', 'agent', 'prompt'] as const;

export const session = snakeCase.table('session', {
  id: text().primaryKey(),
  projectId: text()
    .notNull()
    .references((): typeof project.id => project.id, { onDelete: 'cascade' }),
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
  configValues: text({ mode: 'json' })
    .notNull()
    .default(sql`'[]'`),
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
