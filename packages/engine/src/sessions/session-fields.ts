import {
  type SessionCheckout,
  SessionInfo,
  type SessionRecord,
  SessionSnapshot,
} from '@repo/contracts';
import { isSessionBranch } from '@repo/git';
import { createRejectionCounter } from '@repo/machine-log';
import { TRPCError } from '@trpc/server';
import { ZodError, type infer as Infer } from 'zod';

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

export type SessionSnapshotFields = Infer<typeof sessionSnapshotFields>;

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

export type SessionFieldsRow = Pick<
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

const unrecognisedSession = (): TRPCError =>
  new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Unrecognised Session row',
  });

type RowReader = (sessionId: string) => SessionFieldsRow | undefined;

type RowRejections = ReturnType<typeof createRejectionCounter>;

type RowFailure = { error: unknown };

const isMalformedRow = ({ error }: RowFailure): boolean =>
  error instanceof ZodError || error instanceof SyntaxError;

function readKnownRow(
  readRow: RowReader,
  rejections: RowRejections,
  sessionId: string,
): SessionFieldsRow | undefined {
  try {
    return readRow(sessionId);
  } catch (error) {
    if (!isMalformedRow({ error })) throw error;

    rejections.report('rejected database row', error);
    throw unrecognisedSession();
  }
}

function snapshotFields(stored: SessionFieldsRow): SessionSnapshotFields {
  return {
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
  };
}

function validateFields(
  stored: SessionFieldsRow,
  rejections: RowRejections,
): SessionSnapshotFields {
  const parsed = sessionSnapshotFields.safeParse(snapshotFields(stored));

  if (parsed.success) return parsed.data;

  rejections.report('rejected database row', parsed.error);
  throw unrecognisedSession();
}

const missingSession = (sessionId: string): TRPCError =>
  new TRPCError({ code: 'NOT_FOUND', message: `No Session ${sessionId}` });

// A missing row is NOT_FOUND; a row that fails its shape is reported and refused.
export function createFieldsReader(
  readRow: RowReader,
): (sessionId: string) => SessionSnapshotFields {
  const rejections = createRejectionCounter('sessions');

  return (sessionId: string): SessionSnapshotFields => {
    const stored = readKnownRow(readRow, rejections, sessionId);

    if (!stored) throw missingSession(sessionId);

    return validateFields(stored, rejections);
  };
}
