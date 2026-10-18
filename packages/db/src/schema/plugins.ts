import { sql } from 'drizzle-orm';
import { integer, snakeCase, text } from 'drizzle-orm/sqlite-core';

/*
 * A row exists once the user changes a Plugin; without one it is on, with every setting at its default.
 * Secret settings live in the Keychain, never here.
 */
export const pluginState = snakeCase.table('plugin_state', {
  id: text().primaryKey(),
  enabled: integer({ mode: 'boolean' }).notNull().default(true),
  settings: text({ mode: 'json' })
    .notNull()
    .default(sql`'{}'`),
});
