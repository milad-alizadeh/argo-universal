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
    // Whether Voice calls are offered in the Composer (ADR-0063).
    voiceCalls: integer({ mode: 'boolean' }).notNull().default(true),
    // The Voice provider and voice the next call uses; null until chosen, when the Server's own default applies.
    voiceProvider: text(),
    voiceName: text(),
    // The person's custom voices, as JSON: each a name, a built-in voice and a description of how it speaks.
    voiceCustomVoices: text({ mode: 'json' }).notNull().default('[]'),
    // What every Voice call is told after Argo's own instructions; empty when the person wrote none.
    voiceInstructions: text().notNull().default(''),
  },
  (table) => [check('server_settings_singleton', sql`${table.singleton} = 1`)],
);
