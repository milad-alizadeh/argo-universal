import { index, integer, snakeCase, text } from 'drizzle-orm/sqlite-core';

export const agentCatalogSyncStatuses = [
  'pending',
  'succeeded',
  'failed',
  'interrupted',
] as const;

export const agentCatalogSyncRequest = snakeCase.table(
  'agent_catalog_sync_request',
  {
    sequence: integer().primaryKey({ autoIncrement: true }),
    requestId: text().notNull().unique(),
    syncId: text().notNull(),
    status: text({ enum: agentCatalogSyncStatuses }).notNull(),
    requestedAt: integer().notNull(),
    completedAt: integer(),
    fetchedAt: integer(),
    error: text(),
    rejectedValues: integer().notNull().default(0),
  },
  (table) => [
    index('agent_catalog_sync_request_sync_id_index').on(table.syncId),
    index('agent_catalog_sync_request_status_index').on(table.status),
  ],
);
