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
  public async request(
    sessionId: string,
    fingerprint?: string,
  ): Promise<SessionArchiveOutput> {
    this.sources.open.admit();
    requireArchivable(this.sources, sessionId);
    const actor = this.sources.open.session(sessionId);

    if (!actor) return archiveSession(this.sources, sessionId, { fingerprint });
    this.schedule(actor, sessionId, fingerprint);

    return { scheduled: true };
  }
  private schedule(
    actor: SessionActorRef,
    sessionId: string,
    fingerprint?: string,
  ): void {
    if (this.pending.has(actor)) return;
    this.pending.add(actor);
    void this.whenIdle(actor, sessionId, fingerprint)
      .catch((cause: unknown) => this.failed(sessionId, cause))
      .finally(() => this.pending.delete(actor));
  }
  private async whenIdle(
    actor: SessionActorRef,
    sessionId: string,
    fingerprint?: string,
  ): Promise<void> {
    const idle = await whenArchivable(actor);

    if (idle) await archiveSession(this.sources, sessionId, { fingerprint });
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

async function whenArchivable(
  actor: SessionActorRef,
): Promise<ReturnType<SessionActorRef['getSnapshot']> | null> {
  const signal = actor.getSnapshot().context.acpLifetime.signal;

  try {
    return await waitFor(
      actor,
      (snapshot) => snapshot.can({ type: 'session.archive' }),
      { signal },
    );
  } catch (cause) {
    if (!signal.aborted) throw cause;

    return null;
  }
}
