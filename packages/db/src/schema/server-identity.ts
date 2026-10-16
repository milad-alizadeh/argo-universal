import { sql } from 'drizzle-orm';
import { check, integer, snakeCase, text } from 'drizzle-orm/sqlite-core';

export const serverIdentity = snakeCase.table(
  'server_identity',
  {
    singleton: integer().primaryKey(),
    serverId: text().notNull(),
  },
  (table) => [check('server_identity_singleton', sql`${table.singleton} = 1`)],
);
