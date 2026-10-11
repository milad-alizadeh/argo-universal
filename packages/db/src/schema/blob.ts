import {
  type PrimaryKeyBuilder,
  integer,
  primaryKey,
  snakeCase,
  text,
} from 'drizzle-orm/sqlite-core';
import { session } from './sessions';
import { timestamp } from './timestamp';

// `id` is the sha256 of the file in `~/.argo/blobs/` (ADR-0005).
export const blob = snakeCase.table('blob', {
  id: text().primaryKey(),
  mime: text().notNull(),
  bytes: integer().notNull(),
  width: integer(),
  height: integer(),
  createdAt: timestamp(),
});

// A deleted Session takes its refs with it; the Server deletes blob files that have no ref left.
export const blobRef = snakeCase.table(
  'blob_ref',
  {
    blobId: text()
      .notNull()
      .references((): typeof blob.id => blob.id),
    sessionId: text()
      .notNull()
      .references((): typeof session.id => session.id, { onDelete: 'cascade' }),
  },
  ({ blobId, sessionId }): PrimaryKeyBuilder[] => [
    primaryKey({ columns: [blobId, sessionId] }),
  ],
);
