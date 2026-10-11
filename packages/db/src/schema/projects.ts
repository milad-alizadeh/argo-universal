import { snakeCase, text } from 'drizzle-orm/sqlite-core';
import { timestamp } from './timestamp';

export const project = snakeCase.table('project', {
  id: text().primaryKey(),
  path: text().notNull().unique(),
  name: text().notNull(),
  // The New Session checkout the user chose last, as JSON; null until the first Session.
  checkoutChoice: text({ mode: 'json' }),
  createdAt: timestamp(),
});
