import {
  type SessionCheckout,
  SessionInfo,
  SessionSnapshot,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { session } from '@repo/db/schema';
import { isSessionBranch } from '@repo/git';
import { TRPCError } from '@trpc/server';
import { eq, getTableColumns, sql } from 'drizzle-orm';
import { createRejectionCounter } from '../../lib/count-rejections';

// JSON is decoded per row at the reader boundary, after SQLite has returned the bounded result.
export const storedSessionColumns = {
  ...getTableColumns(session),
  vendorRef: sql<unknown>`${session.vendorRef}`,
  configValues: sql<unknown>`${session.configValues}`,
};

export function decodeStoredSession(row: typeof session.$inferSelect): Omit<
  typeof session.$inferSelect,
  'vendorRef' | 'configValues'
> & {
  vendorRef: ReturnType<typeof JSON.parse>;
  configValues: ReturnType<typeof JSON.parse>;
} {
  return {
    ...row,
    vendorRef:
      row.vendorRef === null ? null : JSON.parse(String(row.vendorRef)),
    configValues: JSON.parse(String(row.configValues)),
  };
}

const sessionSnapshotFields = SessionInfo.pick({
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
type SessionSnapshotFields = import('zod').infer<typeof sessionSnapshotFields>;

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

export function createSessionReader(
  database: Database,
): (sessionId: string) => SessionSnapshotFields {
  const rejections = createRejectionCounter('sessions');
  return (sessionId: string): SessionSnapshotFields => {
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
    const parsed = sessionSnapshotFields.safeParse({
      ...otherColumns,
      checkout: toSessionCheckout({ id, checkoutPath, checkoutBranch }),
    });
    if (!parsed.success) {
      rejections.report('rejected database row', parsed.error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unrecognised Session row',
      });
    }
    return parsed.data;
  };
}
