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

// A Project owns the Schedule independently of every Session it starts.
export const projectSchedule = snakeCase.table('project_schedule', {
  id: text().primaryKey(),
  projectId: text()
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),
  settings: text().notNull(),
  nextAt: integer().notNull(),
  latestSessionId: text(),
});

export const projectScheduleOccurrence = snakeCase.table(
  'project_schedule_occurrence',
  {
    id: text().primaryKey(),
    scheduleId: text()
      .notNull()
      .references(() => projectSchedule.id, { onDelete: 'cascade' }),
    at: integer().notNull(),
    result: text().notNull(),
  },
);
