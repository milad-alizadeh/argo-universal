import {
  type SessionCheckout,
  SessionInfo,
  SessionSnapshot,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { session } from '@repo/db/schema';
import { isSessionBranch } from '@repo/git';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';

const sessionRecord = SessionInfo.pick({
  title: true,
  titleSource: true,
  agent: true,
  parentSessionId: true,
}).extend(
  SessionSnapshot.pick({
    epoch: true,
    maxRevision: true,
    checkout: true,
  }).shape,
);

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

export function createSessionReader(database: Database) {
  let rejectedRows = 0;
  return (sessionId: string) => {
    const stored = database
      .select({
        title: session.title,
        titleSource: session.titleSource,
        agent: session.agent,
        parentSessionId: session.parentSessionId,
        epoch: session.epoch,
        maxRevision: session.maxRevision,
        id: session.id,
        checkoutPath: session.checkoutPath,
        checkoutBranch: session.checkoutBranch,
      })
      .from(session)
      .where(eq(session.id, sessionId))
      .get();
    if (!stored)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No Session ${sessionId}`,
      });
    const { id, checkoutPath, checkoutBranch, ...otherColumns } = stored;
    const parsed = sessionRecord.safeParse({
      ...otherColumns,
      checkout: toSessionCheckout({ id, checkoutPath, checkoutBranch }),
    });
    if (!parsed.success) {
      rejectedRows += 1;
      console.error(
        `sessions: rejected database row #${rejectedRows}`,
        parsed.error,
      );
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unrecognised Session row',
      });
    }
    return parsed.data;
  };
}
