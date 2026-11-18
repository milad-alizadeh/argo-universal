import type { FeedUpdate, SessionArchiveOutput } from '@repo/contracts';
import { waitFor } from 'xstate';
import type { FeedEvent } from '../../feed';
import type { SessionActorRef } from '../session-machine';
import type { SessionHandlerSources } from '../session-sources';
import { archiveSession, requireArchivable } from './archive-commands';

type Sources = Parameters<typeof archiveSession>[0] &
  Pick<SessionHandlerSources, 'findFeed' | 'createId'>;

// A caller must finish its own Turn before archive can close its Agent. The existing actor owns admission and lifecycle.
export class OwnSessionArchive {
  private readonly pending = new WeakSet<SessionActorRef>();
  public constructor(private readonly sources: Sources) {}
  public async request(sessionId: string): Promise<SessionArchiveOutput> {
    this.sources.open.admit();
    requireArchivable(this.sources, sessionId);
    const actor = this.sources.open.session(sessionId);

    if (!actor) return archiveSession(this.sources, sessionId);
    this.schedule(actor, sessionId);

    return { scheduled: true };
  }
  private schedule(actor: SessionActorRef, sessionId: string): void {
    if (this.pending.has(actor)) return;
    this.pending.add(actor);
    void this.whenIdle(actor, sessionId)
      .catch((cause: unknown) => this.failed(sessionId, cause))
      .finally(() => this.pending.delete(actor));
  }
  private async whenIdle(
    actor: SessionActorRef,
    sessionId: string,
  ): Promise<void> {
    const signal = actor.getSnapshot().context.acpLifetime.signal;

    const idle = await waitFor(
      actor,
      (snapshot) => snapshot.can({ type: 'session.archive' }),
      { signal },
    ).catch((cause: unknown) => {
      if (!signal.aborted) throw cause;

      return null;
    });

    if (idle) await archiveSession(this.sources, sessionId);
  }

  private failed(sessionId: string, cause: unknown): void {
    this.sources
      .findFeed(sessionId)
      ?.send(archiveFailure(this.sources.createId(), cause));
  }
}

type ArchiveNotice = Extract<FeedUpdate, { sessionUpdate: 'notice' }>;

const archiveNotice = (id: string, cause: unknown): ArchiveNotice => ({
  id,
  sessionUpdate: 'notice',
  state: 'settled',
  severity: 'warning',
  title: 'Session could not be archived',
  description: cause instanceof Error ? cause.message : String(cause),
});

export const archiveFailure = (id: string, cause: unknown): FeedEvent => ({
  type: 'feed.change',
  turnId: null,
  blobs: [],
  change: { type: 'upsert', update: archiveNotice(id, cause) },
});
