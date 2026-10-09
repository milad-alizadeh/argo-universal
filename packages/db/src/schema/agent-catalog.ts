import { integer, snakeCase, text } from 'drizzle-orm/sqlite-core';

// One last-good upstream catalog; fetchedAt is Unix milliseconds.
export const agentCatalogCache = snakeCase.table('agent_catalog_cache', {
  id: integer().primaryKey(),
  payload: text().notNull(),
  fetchedAt: integer().notNull(),
});
