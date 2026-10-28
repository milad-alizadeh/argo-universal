import {
  type SessionCheckout,
  SessionInfo,
  SessionRecord,
  SessionSnapshot,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { session } from '@repo/db/schema';
import { isSessionBranch } from '@repo/git';
import { createRejectionCounter } from '@repo/machine-log';
import { TRPCError } from '@trpc/server';
import { eq, getTableColumns, sql } from 'drizzle-orm';
import { ZodError, type infer as Infer } from 'zod';
import type { WriterActorRef } from '../storage';
import { readQueuedSessionRows, type RowSources } from './session-storage';

// JSON is decoded per row at the reader boundary, after SQLite has returned the bounded result.
export const storedSessionColumns = {
  ...getTableColumns(session),
  vendorRef: sql<unknown>`${session.vendorRef}`,
  configValues: sql<unknown>`${session.configValues}`,
  heldConfig: sql<unknown>`${session.heldConfig}`,
};

export function decodeStoredSession(row: typeof session.$inferSelect): Omit<
  typeof session.$inferSelect,
  'vendorRef' | 'configValues' | 'heldConfig'
> & {
  vendorRef: ReturnType<typeof JSON.parse>;
  configValues: ReturnType<typeof JSON.parse>;
  heldConfig: ReturnType<typeof JSON.parse>;
} {
  return {
    ...row,
    vendorRef:
      row.vendorRef === null ? null : JSON.parse(String(row.vendorRef)),
    configValues: JSON.parse(String(row.configValues)),
    heldConfig: JSON.parse(String(row.heldConfig)),
  };
}

const sessionSnapshotFields = SessionInfo.pick({
  projectId: true,
  title: true,
  archivedAt: true,
  titleSource: true,
  agent: true,
  parentSessionId: true,
  startedBySessionId: true,
}).extend(
  SessionSnapshot.pick({
    epoch: true,
    maxRevision: true,
    checkout: true,
  }).shape,
);

type SessionSnapshotFields = Infer<typeof sessionSnapshotFields>;

// A worktree Session runs on its own Session branch; any other branch is the main checkout.
export function toSessionCheckout(row: {
  id: string;
  checkoutPath: SessionCheckout['path'];
  checkoutBranch: SessionCheckout['branch'];
}): SessionCheckout {
  return {
    type: isSessionBranch(row.checkoutBranch, row.id) ? 'worktree' : 'main',
    path: row.checkoutPath,
    branch: row.checkoutBranch,
  };
}

type SessionFieldsRow = Pick<
  SessionRecord,
  | 'id'
  | 'projectId'
  | 'title'
  | 'archivedAt'
  | 'titleSource'
  | 'agent'
  | 'parentSessionId'
  | 'startedBySessionId'
  | 'epoch'
  | 'maxRevision'
  | 'checkoutPath'
  | 'checkoutBranch'
>;

export function createSessionReader(
  database: Database,
): (sessionId: string) => SessionSnapshotFields {
  return createFieldsReader((sessionId): SessionFieldsRow | undefined =>
    database
      .select({
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
      })
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

const unrecognisedSession = (): TRPCError =>
  new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Unrecognised Session row',
  });

// A missing row is NOT_FOUND; a row that fails its shape is reported and refused.
function createFieldsReader(
  readRow: (sessionId: string) => SessionFieldsRow | undefined,
): (sessionId: string) => SessionSnapshotFields {
  const rejections = createRejectionCounter('sessions');

  const readKnownRow = (sessionId: string): SessionFieldsRow | undefined => {
    try {
      return readRow(sessionId);
    } catch (error) {
      if (!(error instanceof ZodError || error instanceof SyntaxError))
        throw error;
      rejections.report('rejected database row', error);
      throw unrecognisedSession();
    }
  };

  return (sessionId: string): SessionSnapshotFields => {
    const stored = readKnownRow(sessionId);

    if (!stored)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No Session ${sessionId}`,
      });

    const parsed = sessionSnapshotFields.safeParse({
      projectId: stored.projectId,
      title: stored.title,
      archivedAt: stored.archivedAt,
      titleSource: stored.titleSource,
      agent: stored.agent,
      parentSessionId: stored.parentSessionId,
      startedBySessionId: stored.startedBySessionId,
      epoch: stored.epoch,
      maxRevision: stored.maxRevision,
      checkout: toSessionCheckout(stored),
    });

    if (!parsed.success) {
      rejections.report('rejected database row', parsed.error);
      throw unrecognisedSession();
    }

    return parsed.data;
  };
}
