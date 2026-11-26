import { primaryKey, snakeCase, text } from 'drizzle-orm/sqlite-core';
import { project } from '#schema-projects';
import { timestamp } from '#schema-timestamp';

/*
 * An Operation the person chose Always allow for: Sessions whose delegation chain starts in `projectId` run it into
 * `targetProjectId` without asking again (ADR-0044).
 */
export const operationGrant = snakeCase.table(
  'operation_grant',
  {
    projectId: text()
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    operationId: text().notNull(),
    targetProjectId: text()
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    createdAt: timestamp(),
  },
  (table) => [
    primaryKey({
      columns: [table.projectId, table.operationId, table.targetProjectId],
    }),
  ],
);
