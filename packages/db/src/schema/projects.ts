import { integer, snakeCase, text } from 'drizzle-orm/sqlite-core';
import { timestamp } from '#schema-timestamp';

export const project = snakeCase.table('project', {
  id: text().primaryKey(),
  path: text().notNull().unique(),
  name: text().notNull(),
  // The New Session checkout the user chose last, as JSON; null until the first Session.
  checkoutChoice: text({ mode: 'json' }),
  // Whether archiving one of this Project's Sessions removes its worktree; each archive records its own answer.
  deleteWorktreeOnArchive: integer({ mode: 'boolean' }).notNull().default(true),
  createdAt: timestamp(),
});
