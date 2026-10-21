import { sql } from 'drizzle-orm';
import {
  foreignKey,
  integer,
  primaryKey,
  snakeCase,
  text,
  unique,
} from 'drizzle-orm/sqlite-core';
import { project } from '#schema-projects';

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

export const pluginAccount = snakeCase.table(
  'plugin_account',
  {
    id: text().primaryKey(),
    host: text().notNull(),
    label: text().notNull(),
    providedBy: text().notNull(),
  },
  (table) => [unique().on(table.host, table.id)],
);

export const pluginAccountGrant = snakeCase.table(
  'plugin_account_grant',
  {
    host: text().notNull(),
    account: text().notNull(),
    plugin: text().notNull(),
    allowed: integer({ mode: 'boolean' }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.host, table.account, table.plugin] }),
    foreignKey({
      columns: [table.host, table.account],
      foreignColumns: [pluginAccount.host, pluginAccount.id],
    }).onDelete('cascade'),
  ],
);

export const projectAccount = snakeCase.table(
  'project_account',
  {
    projectId: text()
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    host: text().notNull(),
    account: text().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.host] }),
    foreignKey({
      columns: [table.host, table.account],
      foreignColumns: [pluginAccount.host, pluginAccount.id],
    }).onDelete('cascade'),
  ],
);
