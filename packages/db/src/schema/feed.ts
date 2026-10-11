import {
  type IndexBuilder,
  type PrimaryKeyBuilder,
  index,
  integer,
  primaryKey,
  snakeCase,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { session } from './sessions';
import { timestamp } from './timestamp';

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

export const sessionUpdateStates = ['open', 'settled'] as const;

const kindIndex = 'feed_row_session_id_session_update_position_index';

export const feedRow = snakeCase.table(
  'feed_row',
  {
    sessionId: text()
      .notNull()
      .references((): typeof session.id => session.id, { onDelete: 'cascade' }),
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
  (table): (IndexBuilder | PrimaryKeyBuilder)[] => [
    primaryKey({ columns: [table.sessionId, table.position] }),
    uniqueIndex('feed_row_session_id_id_unique').on(table.sessionId, table.id),
    index('feed_row_session_id_revision_index').on(
      table.sessionId,
      table.revision,
    ),
    index(kindIndex).on(table.sessionId, table.sessionUpdate, table.position),
  ],
);
