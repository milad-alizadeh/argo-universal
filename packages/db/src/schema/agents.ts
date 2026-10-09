import { integer, snakeCase, text } from 'drizzle-orm/sqlite-core';

/*
 * Stable local identity; sync owns only registry metadata/presence/timestamp.
 * Registration extends these same rows with local definition/configuration facts.
 */
export const agents = snakeCase.table('agents', {
  id: text().primaryKey(),
  registryId: text().unique(),
  registryMetadata: text(),
  catalogPresent: integer({ mode: 'boolean' }).notNull().default(false),
  catalogSyncedAt: integer(),
});
