import { primaryKey, snakeCase, text } from 'drizzle-orm/sqlite-core';
import { project } from '#schema-projects';
import { timestamp } from '#schema-timestamp';

// An Operation the person chose Always allow for: Sessions in this Project run it without asking again.
export const operationGrant = snakeCase.table(
  'operation_grant',
  {
    projectId: text()
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    operationId: text().notNull(),
    createdAt: timestamp(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.operationId] })],
);
