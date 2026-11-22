import type { Database } from '@repo/db';
import { TRPCError } from '@trpc/server';
import { createSessionReader, namedParam } from '../sessions';
import type { RunCheckout, RunRequest } from './runs-input';

type Session = ReturnType<ReturnType<typeof createSessionReader>>;

const checkoutOf = ({ projectId, checkout }: Session): RunCheckout => ({
  projectId,
  checkoutPath: checkout.path,
});

const requireSessionId = (sessionId: string | undefined): string =>
  namedParam(
    sessionId,
    'Pass sessionId: the Session whose Checkout runs it. A Session that runs this uses its own.',
  );

function requireOpen({ archivedAt }: Session): void {
  if (archivedAt !== null)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'This Session is archived.',
    });
}

// A Terminal belongs to a Checkout. Opening a new one also needs its requesting Session to remain open.
export class TerminalSessions {
  private readonly readSession: ReturnType<typeof createSessionReader>;

  public constructor(database: Database) {
    this.readSession = createSessionReader(database);
  }

  public checkout(sessionId: string | undefined): RunCheckout {
    return checkoutOf(this.readSession(requireSessionId(sessionId)));
  }

  public forStart(sessionId: string | undefined): RunRequest {
    const id = requireSessionId(sessionId);
    const session = this.readSession(id);

    requireOpen(session);

    return this.request(id, session);
  }

  public forAutoStart(sessionId: string): RunRequest | undefined {
    const session = this.readSession(sessionId);

    return session.archivedAt === null
      ? this.request(sessionId, session)
      : undefined;
  }

  private request(sessionId: string, session: Session): RunRequest {
    return {
      ...checkoutOf(session),
      starter: { id: sessionId, title: session.title ?? '' },
      requireOpenSession: () => requireOpen(this.readSession(sessionId)),
    };
  }
}
