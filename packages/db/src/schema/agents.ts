import { integer, snakeCase, text } from 'drizzle-orm/sqlite-core';

/*
 * Stable local identity; sync owns only registry metadata/presence/timestamp.
 * `configuration` is the person's saved Agent as JSON, null while the row is catalog-only.
 * Readiness is the last ACP check: a null status means no check has finished yet.
 * The Installation observation is what the Resolver last found: a null launch at a set time means nothing was found.
 */
export const agents = snakeCase.table('agents', {
  id: text().primaryKey(),
  registryId: text().unique(),
  registryMetadata: text(),
  catalogPresent: integer({ mode: 'boolean' }).notNull().default(false),
  catalogSyncedAt: integer(),
  catalogSearchText: text().notNull().default(''),
  configuration: text(),
  enabled: integer({ mode: 'boolean' }).notNull().default(true),
  readinessStatus: text(),
  readinessReason: text(),
  readinessCheckedAt: integer(),
  installationLaunch: text(),
  installationOwner: text(),
  installationVersion: text(),
  installationObservedAt: integer(),
});
