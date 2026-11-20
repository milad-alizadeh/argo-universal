import type { FeedSubscribeOutput, SessionSnapshot } from '@repo/contracts';
import type { FeedDeps } from '../feed';
import { FeedHappenings } from './feed-happenings';
import { InputRequestWatch } from './input-request-watch';
import type { SessionHappening } from './session-link';

export type FeedSources = Pick<FeedDeps, 'findFeed' | 'watchSessionSnapshot'>;

type FeedActor = NonNullable<ReturnType<FeedSources['findFeed']>>;

type Listener = (happening: SessionHappening) => void;

type Stoppable = { unsubscribe: () => void };

type SnapshotEvent = Extract<
  FeedSubscribeOutput,
  { type: 'snapshot' | 'closed' }
>;

// The Session a FeedWatch hears, who hears it, and who hears each of its snapshots.
export type FeedHearing = {
  sessionId: string;
  listener: Listener;
  snapshotted?: (snapshot: SessionSnapshot) => void;
};

// How long an Agent message outside any Turn must stop growing before the voice hears it.
const quietMs = 800;

/*
 * Listens to one Session's Feed for the Agent's and the person's words, following it when the Session replaces its Feed
 * actor, and to its Permission requests and Elicitations.
 */
export class FeedWatch {
  private readonly happenings = new FeedHappenings();
  private readonly requests: InputRequestWatch;
  private feed: FeedActor | undefined;
  private batches: Stoppable | undefined;
  private readonly snapshots: Stoppable;
  private quietTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly sessionId: string;
  private readonly listener: Listener;
  private readonly snapshotted?: (snapshot: SessionSnapshot) => void;

  public constructor(
    private readonly sources: FeedSources,
    hearing: FeedHearing,
  ) {
    ({
      sessionId: this.sessionId,
      listener: this.listener,
      snapshotted: this.snapshotted,
    } = hearing);
    this.requests = new InputRequestWatch(this.listener);
    this.follow();
    this.snapshots = sources.watchSessionSnapshot(this.sessionId, {
      next: (event): void => this.changed(event),
    });
  }

  public stop(): void {
    clearTimeout(this.quietTimer);
    this.snapshots.unsubscribe();
    this.batches?.unsubscribe();
  }

  private tell(happenings: readonly SessionHappening[]): void {
    for (const happening of happenings) this.listener(happening);
  }

  // A held Agent message is heard once nothing more arrives for it for a while.
  private awaitQuiet(): void {
    clearTimeout(this.quietTimer);

    if (this.happenings.holding)
      this.quietTimer = setTimeout(
        () => this.tell(this.happenings.quiet()),
        quietMs,
      );
  }

  private changed(event: SnapshotEvent): void {
    this.follow();

    if (event.type !== 'snapshot') return;
    // Its title and Agents first, so a request it waits on is told under its title.
    this.snapshotted?.(event.snapshot);
    this.requests.changed(event.snapshot);
  }

  private isNew(next: FeedActor | undefined): next is FeedActor {
    return next !== undefined && next !== this.feed;
  }

  private follow(): void {
    const next = this.sources.findFeed(this.sessionId);

    if (!this.isNew(next)) return;
    this.batches?.unsubscribe();
    this.feed = next;
    this.batches = next.on('feed.batch', (batch): void => {
      this.tell(this.happenings.read(batch.events));
      this.awaitQuiet();
    });
  }
}
