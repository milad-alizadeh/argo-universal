import {
  index,
  integer,
  primaryKey,
  snakeCase,
  text,
} from 'drizzle-orm/sqlite-core';
import { blob } from '#schema-blob';
import { project } from '#schema-projects';

export const runStatuses = [
  'starting',
  'ready',
  'stopped',
  'crashed',
  'lost',
] as const;

// One live or finished instance of a Run Configuration in one Checkout; finished output uses the shared Blob store.
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
    outputBlobId: text().references(() => blob.id),
  },
  ({ projectId, checkoutPath, outputBlobId }) => [
    index('run_checkout_index').on(projectId, checkoutPath),
    index('run_output_blob_index').on(outputBlobId),
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
