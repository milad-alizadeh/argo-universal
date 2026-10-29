import { sql } from 'drizzle-orm';
import { check, integer, snakeCase } from 'drizzle-orm/sqlite-core';

export const agentAccess = snakeCase.table(
  'agent_access',
  {
    singleton: integer().primaryKey(),
    enabled: integer({ mode: 'boolean' }).notNull().default(true),
  },
  (table) => [check('agent_access_singleton', sql`${table.singleton} = 1`)],
);
