import type { SessionArchiveOutput } from '@repo/contracts';
import type { CheckoutCleanupRisk } from '@repo/git';
import { TRPCError } from '@trpc/server';
import type { SessionHandlerSources } from '../session-sources';
import { archiveSession, requireArchivable } from './archive-commands';
import { inspectArchiveCleanup } from './checkout-cleanup';
import { OwnSessionArchive } from './own-archive';

export class SessionArchives {
  private readonly own: OwnSessionArchive;
  public constructor(private readonly sources: SessionHandlerSources) {
    this.own = new OwnSessionArchive(sources);
  }

  public inspect(
    sessionId: string,
    own: boolean,
  ): Promise<CheckoutCleanupRisk> {
    requireArchivable(this.sources, sessionId);

    if (!own) this.requireIdle(sessionId);

    const { projectId, checkout } = this.sources.readSession(sessionId);

    return inspectArchiveCleanup(this.sources.database, {
      projectId,
      sessionId,
      checkout,
    });
  }

  public archive(
    sessionId: string,
    fingerprint?: string,
  ): Promise<SessionArchiveOutput> {
    return archiveSession(this.sources, sessionId, { fingerprint });
  }

  public archiveOwn(
    sessionId: string,
    fingerprint?: string,
  ): Promise<SessionArchiveOutput> {
    return this.own.request(sessionId, fingerprint);
  }

  private requireIdle(sessionId: string): void {
    const live = this.sources.open.session(sessionId);

    if (live && !live.getSnapshot().can({ type: 'session.archive' }))
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Only an idle Session can be archived',
      });
  }
}
