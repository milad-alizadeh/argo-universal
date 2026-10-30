import { SessionRecord } from '@repo/contracts';
import type { Database } from '@repo/db';
import { session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { WriterActorRef } from '../storage';
import {
  createFieldsReader,
  type SessionFieldsRow,
  type SessionSnapshotFields,
} from './session-fields';
import { readQueuedSessionRows, type RowSources } from './session-storage';
import { decodeStoredSession, storedSessionColumns } from './stored-session';

export { toSessionCheckout } from './session-fields';

export { decodeStoredSession, storedSessionColumns } from './stored-session';

const sessionFieldColumns = {
  projectId: session.projectId,
  title: session.title,
  archivedAt: session.archivedAt,
  titleSource: session.titleSource,
  agent: session.agent,
  parentSessionId: session.parentSessionId,
  startedBySessionId: session.startedBySessionId,
  epoch: session.epoch,
  maxRevision: session.maxRevision,
  id: session.id,
  checkoutPath: session.checkoutPath,
  checkoutBranch: session.checkoutBranch,
};

export function createSessionReader(
  database: Database,
): (sessionId: string) => SessionSnapshotFields {
  return createFieldsReader((sessionId): SessionFieldsRow | undefined =>
    database
      .select(sessionFieldColumns)
      .from(session)
      .where(eq(session.id, sessionId))
      .get(),
  );
}

// The Session row as the Writer will leave it: the stored row with the queued Session jobs replayed over it.
export function readSessionRow(
  sources: RowSources,
  sessionId: string,
): SessionRecord | undefined {
  const stored = sources.database
    .select(storedSessionColumns)
    .from(session)
    .where(eq(session.id, sessionId))
    .get();

  return readQueuedSessionRows(sources.writer).session(
    stored && SessionRecord.parse(decodeStoredSession(stored)),
    sessionId,
  );
}

// The same fields as `createSessionReader`, read through the Writer's queue as a Session snapshot shows them.
export function createQueuedSessionReader(sources: {
  database: Database;
  findWriter: () => WriterActorRef | undefined;
}): (sessionId: string) => SessionSnapshotFields {
  return createFieldsReader((sessionId): SessionFieldsRow | undefined =>
    readSessionRow(
      { database: sources.database, writer: sources.findWriter() },
      sessionId,
    ),
  );
}
