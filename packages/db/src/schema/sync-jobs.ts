import { integer, primaryKey, snakeCase, text } from 'drizzle-orm/sqlite-core';

export const syncJobs = snakeCase.table(
  'sync_jobs',
  {
    source: text().notNull(),
    scope: text().notNull(),
    status: text({ enum: ['idle', 'pending', 'running', 'failed'] }).notNull(),
    requestedAt: integer().notNull(),
    completedAt: integer(),
    fetchedAt: integer(),
    error: text(),
    rejectedValues: integer().notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.source, table.scope] })],
);
