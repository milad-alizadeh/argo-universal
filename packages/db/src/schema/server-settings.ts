import { sql } from 'drizzle-orm';
import { check, integer, snakeCase, text } from 'drizzle-orm/sqlite-core';

// The Server's own settings, kept on the Server so every Device reads the same answer.
export const serverSettings = snakeCase.table(
  'server_settings',
  {
    singleton: integer().primaryKey(),
    // Whether the Server outlives the desktop app that started it (ADR-0022).
    keepRunningAfterQuit: integer({ mode: 'boolean' }).notNull().default(false),
    // Whether Sessions keep a checklist of their steps (ADR-0053).
    todoList: integer({ mode: 'boolean' }).notNull().default(true),
    // Whether Voice calls are offered in the Composer (ADR-0062).
    voiceCalls: integer({ mode: 'boolean' }).notNull().default(true),
    // The Voice provider and voice the next call uses; null until chosen, when the Server's own default applies.
    voiceProvider: text(),
    voiceName: text(),
  },
  (table) => [check('server_settings_singleton', sql`${table.singleton} = 1`)],
);
