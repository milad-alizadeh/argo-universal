import type { Database } from '@repo/db';
import { session } from '@repo/db/schema';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { closeArchivedShells } from '../../runs';
import {
  type WriterActorRef,
  writeDatabaseJobAndWaitForCommit,
} from '../../storage';
import type { SessionContext } from '../session-machine';
import { readBorrowerIds } from './archive-borrowers';
import { SessionArchiveJob } from './archive-storage';
import {
  projectKeepsCheckout,
  removeSessionCheckout,
} from './checkout-cleanup';

const storedArchivedAt = (context: SessionContext): number | null =>
  context.input.database
    .select({ archivedAt: session.archivedAt })
    .from(session)
    .where(eq(session.id, context.sessionId))
    .get()?.archivedAt ?? null;

const takenBorrowerIds = (context: SessionContext): string[] => {
  const taken = storedArchivedAt(context);

  return taken === null
    ? []
    : readBorrowerIds(context.input.database, context.sessionId, taken);
};

// An archive takes the open borrowers of the Session's worktree; its Undo restores the ones it took.
const borrowerIds = (
  context: SessionContext,
  archivedAt: number | null,
): string[] =>
  archivedAt === null
    ? takenBorrowerIds(context)
    : readBorrowerIds(context.input.database, context.sessionId, null);

const archivedSessionIds = (
  context: SessionContext,
  archivedAt: number | null,
): string[] => [
  context.sessionId,
  ...context.input.database
    .select({ id: session.id })
    .from(session)
    .where(eq(session.parentSessionId, context.sessionId))
    .all()
    .map(({ id }) => id),
  ...borrowerIds(context, archivedAt),
];

// The parent's archive and its borrowed Checkouts share one Writer commit.
export async function saveSessionArchive(
  context: SessionContext,
  writer: WriterActorRef | undefined,
  archivedAt: number | null = context.input.now(),
): Promise<void> {
  if (!writer) throw new Error('Database Writer is unavailable');

  const { database } = context.input;
  const sessionIds = archivedSessionIds(context, archivedAt);
  const keep =
    archivedAt !== null && projectKeepsCheckout(database, context.projectId);

  await writeDatabaseJobAndWaitForCommit(
    writer,
    new SessionArchiveJob(sessionIds, archivedAt, keep),
    true,
  );

  if (archivedAt !== null)
    await closeArchivedShells(database, sessionIds).catch((error: unknown) => {
      console.error(
        `Session ${context.sessionId}: could not close shell Terminals`,
        error,
      );
    });
}

type ArchivedCheckout = Pick<
  typeof session.$inferSelect,
  'id' | 'projectId' | 'checkoutPath' | 'checkoutBranch'
>;

async function recoverArchivedCheckout(
  database: Database,
  row: ArchivedCheckout,
): Promise<void> {
  try {
    await removeSessionCheckout(database, {
      projectId: row.projectId,
      sessionId: row.id,
      checkout: { path: row.checkoutPath, branch: row.checkoutBranch },
    });
  } catch (error) {
    console.error(`Session ${row.id}: archive cleanup deferred`, error);
  }
}

// Startup owns only cleanup: an old archive never reopens an Agent or its Undo window.
export async function recoverArchivedCheckouts(
  database: Database,
): Promise<void> {
  const rows = database
    .select({
      id: session.id,
      projectId: session.projectId,
      checkoutPath: session.checkoutPath,
      checkoutBranch: session.checkoutBranch,
    })
    .from(session)
    .where(and(isNotNull(session.archivedAt), isNull(session.parentSessionId)))
    .all();

  for (const row of rows) await recoverArchivedCheckout(database, row);
}
