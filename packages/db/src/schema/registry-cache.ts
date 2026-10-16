import { sql } from 'drizzle-orm';
import { check, integer, snakeCase, text } from 'drizzle-orm/sqlite-core';

export const registryCache = snakeCase.table(
  'registry_cache',
  {
    id: integer().primaryKey(),
    json: text(),
    fetchedAt: integer(),
  },
  (table) => [check('registry_cache_singleton', sql`${table.id} = 1`)],
);
