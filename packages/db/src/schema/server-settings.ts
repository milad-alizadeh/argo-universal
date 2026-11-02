import { sql } from 'drizzle-orm';
import { check, integer, snakeCase } from 'drizzle-orm/sqlite-core';

// The Server's own settings, kept on the Server so every Device reads the same answer.
export const serverSettings = snakeCase.table(
  'server_settings',
  {
    singleton: integer().primaryKey(),
    // Whether the Server outlives the desktop app that started it (ADR-0022).
    keepRunningAfterQuit: integer({ mode: 'boolean' }).notNull().default(false),
  },
  (table) => [check('server_settings_singleton', sql`${table.singleton} = 1`)],
);
