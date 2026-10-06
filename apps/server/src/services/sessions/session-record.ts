import { SessionInfo, SessionSnapshot } from '@repo/contracts';
import type { Database } from '@repo/db';
import { session } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';

const sessionRecord = SessionInfo.pick({
  title: true,
  titleSource: true,
  agent: true,
  parentSessionId: true,
}).extend(SessionSnapshot.pick({ epoch: true, maxRevision: true }).shape);

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
      })
      .from(session)
      .where(eq(session.id, sessionId))
      .get();
    if (!stored)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No Session ${sessionId}`,
      });
    const parsed = sessionRecord.safeParse(stored);
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
