import type { Database } from '@repo/db';
import { session } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, eq, isNull, ne } from 'drizzle-orm';
import { closeSession } from '../session-closure';
import { readStoredCheckout } from '../session-record';
import type { HandlerSources } from '../session-sources';
import { readLatestTurns } from '../session-storage';

type BorrowerSources = HandlerSources<
  'database' | 'findWriter',
  'admit' | 'live' | 'queued' | 'context'
>;

const archivedWith = (archivedAt: number | null): ReturnType<typeof isNull> =>
  archivedAt === null
    ? isNull(session.archivedAt)
    : eq(session.archivedAt, archivedAt);

// The worktree a Session made for itself; a Session in the main checkout or a borrowed one owns none.
const readOwnedWorktree = (
  database: Database,
  ownerId: string,
): string | undefined => {
  const owner = readStoredCheckout(database, ownerId);

  return owner?.type === 'worktree' ? owner.path : undefined;
};

const sharesWorktree = (
  path: string,
  ownerId: string,
): ReturnType<typeof and> =>
  and(
    eq(session.checkoutPath, path),
    ne(session.id, ownerId),
    isNull(session.parentSessionId),
  );

/*
 * The Sessions that borrowed a worktree its owner made (ADR-0008), found by the path they share: the
 * open ones, or the ones archived in the owner's archive at `archivedAt`.
 */
export function readBorrowerIds(
  database: Database,
  ownerId: string,
  archivedAt: number | null,
): string[] {
  const path = readOwnedWorktree(database, ownerId);

  if (path === undefined) return [];

  return database
    .select({ id: session.id })
    .from(session)
    .where(and(sharesWorktree(path, ownerId), archivedWith(archivedAt)))
    .all()
    .map(({ id }) => id);
}

// A live Session answers for its own Turn; a closed one answers from its latest stored Turn.
function runningBorrowers(
  sources: BorrowerSources,
  borrowers: string[],
): string[] {
  const latest = readLatestTurns(
    { database: sources.database, writer: sources.findWriter() },
    borrowers,
  );

  return borrowers.filter((id) => {
    const live = sources.open.context(id);

    return live ? live.activeTurnId !== null : latest(id)?.status === 'running';
  });
}

function requireIdle(sources: BorrowerSources, borrowers: string[]): void {
  if (runningBorrowers(sources, borrowers).length)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'A Session that borrowed this Checkout is running a Turn',
    });
}

// An owner's archive removes its worktree, so its idle borrowers close first and a running one refuses the archive.
export async function closeBorrowers(
  sources: BorrowerSources,
  ownerId: string,
): Promise<void> {
  const borrowers = readBorrowerIds(sources.database, ownerId, null);

  requireIdle(sources, borrowers);

  await Promise.all(
    borrowers
      .filter((id) => sources.open.context(id))
      .map((id) => closeSession(sources.open, id)),
  );
}
