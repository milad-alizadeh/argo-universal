import {
  index,
  integer,
  primaryKey,
  snakeCase,
  text,
} from 'drizzle-orm/sqlite-core';
import { project } from '#schema-projects';

export const runStatuses = [
  'starting',
  'ready',
  'stopped',
  'crashed',
  'lost',
] as const;

// One live or finished instance of a Run Configuration in one Checkout; its output lives in a file of its own under the Server's home.
export const run = snakeCase.table(
  'run',
  {
    id: text().primaryKey(),
    projectId: text()
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    checkoutPath: text().notNull(),
    name: text().notNull(),
    command: text().notNull(),
    cwd: text().notNull(),
    port: integer().notNull(),
    url: text().notNull(),
    // The terminal's process, which leads its own group; recovery after a crash kills that group.
    pid: integer(),
    status: text({ enum: runStatuses }).notNull(),
    exitCode: integer(),
    startedAt: integer().notNull(),
    readyAt: integer(),
    endedAt: integer(),
  },
  ({ projectId, checkoutPath }) => [
    index('run_checkout_index').on(projectId, checkoutPath),
  ],
);

// Personal settings follow a Project's named Run Configuration across its Checkouts.
export const runSettings = snakeCase.table(
  'run_settings',
  {
    projectId: text()
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    env: text({ mode: 'json' }),
    port: integer(),
    trusted: text(),
    autoStart: text(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.name] })],
);
