import {
  type PrimaryKeyBuilder,
  integer,
  primaryKey,
  snakeCase,
  text,
} from 'drizzle-orm/sqlite-core';
import { blob } from './blob';
import { session } from './sessions';

export const shellStatuses = ['running', 'exited', 'stopped', 'lost'] as const;

export const shell = snakeCase.table(
  'shell',
  {
    sessionId: text()
      .notNull()
      .references(() => session.id, { onDelete: 'cascade' }),
    id: text().notNull(),
    toolCallId: text().notNull(),
    command: text().notNull(),
    cwd: text().notNull(),
    status: text({ enum: shellStatuses }).notNull(),
    exitCode: integer(),
    startedAt: integer().notNull(),
    endedAt: integer(),
    outputBlobId: text().references(() => blob.id),
  },
  (table): PrimaryKeyBuilder[] => [
    primaryKey({ columns: [table.sessionId, table.id] }),
  ],
);
