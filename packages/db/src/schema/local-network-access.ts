import { sql } from 'drizzle-orm';
import { check, integer, snakeCase } from 'drizzle-orm/sqlite-core';

export const localNetworkAccess = snakeCase.table(
  'local_network_access',
  {
    singleton: integer().primaryKey(),
    enabled: integer({ mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    check('local_network_access_singleton', sql`${table.singleton} = 1`),
  ],
);
