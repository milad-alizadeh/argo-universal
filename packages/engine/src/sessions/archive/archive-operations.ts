import type { Database } from '@repo/db';
import { project, session } from '@repo/db/schema';
import { removeCheckout } from '@repo/git';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { readProjectPath } from '../../projects';
import {
  type WriterActorRef,
  writeDatabaseJobAndWaitForCommit,
} from '../../storage';
import type { SessionData } from '../session-data';
import type { SessionContext } from '../session-machine';
import { ownsStoredWorktree } from '../session-record';
import { readBorrowerIds } from './archive-borrowers';
import { SessionArchiveJob } from './archive-storage';

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

// Whether this archive keeps the worktree is settled now, so changing the Project's setting later never removes it.
const keepsCheckout = (context: SessionContext): boolean =>
  context.input.database
    .select({ deletes: project.deleteWorktreeOnArchive })
    .from(project)
    .where(eq(project.id, context.projectId))
    .get()?.deletes === false;

const archiveJob = (
  context: SessionContext,
  archivedAt: number | null,
): SessionArchiveJob =>
  new SessionArchiveJob(
    archivedSessionIds(context, archivedAt),
    archivedAt,
    archivedAt !== null && keepsCheckout(context),
  );

// The parent's archive and its borrowed Checkouts share one Writer commit.
export async function saveSessionArchive(
  context: SessionContext,
  writer: WriterActorRef | undefined,
  archivedAt: number | null = context.input.now(),
): Promise<void> {
  if (!writer) throw new Error('Database Writer is unavailable');

  await writeDatabaseJobAndWaitForCommit(
    writer,
    archiveJob(context, archivedAt),
    true,
  );
}

const isCheckoutKept = (database: Database, sessionId: string): boolean =>
  database
    .select({ keep: session.keepCheckout })
    .from(session)
    .where(eq(session.id, sessionId))
    .get()?.keep === true;

export async function removeSessionCheckout(
  database: Database,
  data: Pick<SessionData, 'projectId' | 'sessionId' | 'checkout'>,
  signal?: AbortSignal,
): Promise<void> {
  if (!ownsStoredWorktree(database, data.sessionId)) return;

  if (isCheckoutKept(database, data.sessionId)) return;

  await removeCheckout(
    readProjectPath(database, data.projectId),
    data.checkout,
    signal,
  );
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
