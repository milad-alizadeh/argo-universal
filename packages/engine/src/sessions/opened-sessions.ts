import type { Subscription } from 'xstate';
import type { SessionActorRef } from './session-machine';
import type { HandlerSources } from './session-sources';
import { onWriterChange } from './writer-changes';

type OpenedSources = HandlerSources<
  'findWriter',
  'queued' | 'ids' | 'session' | 'subscribe'
>;

// One direct Started Session's observation. State survives across its actor lifetimes.
export type StartedSessionObservation = {
  follow: (actor: Pick<SessionActorRef, 'on' | 'subscribe'>) => Subscription;
  stop?: () => void;
};

export type StartedSessionObserver = (
  sessionId: string,
) => StartedSessionObservation;

type Row = ReturnType<OpenedSources['open']['queued']>;

type FollowedSession = {
  actor: SessionActorRef;
  subscription: Subscription;
};

// A Session's row includes the Writer's queued insert, once it exists.
function rowOf(sources: OpenedSources, sessionId: string): Row | undefined {
  try {
    return sources.open.queued(sessionId);
  } catch {
    return undefined;
  }
}

/*
 * Follow direct Started Sessions once their origin can be read. Each observer lives until the
 * watch stops, while its subscription lives only as long as the actor it follows.
 */
class StartedSessionWatch {
  private readonly checked = new Set<string>();
  private readonly unwritten = new Set<string>();
  private readonly observers = new Map<string, StartedSessionObservation>();
  private readonly following = new Map<string, FollowedSession>();
  private readonly subscriptions: Subscription[];

  public constructor(
    private readonly sources: OpenedSources,
    private readonly starterId: string,
    private readonly observe: StartedSessionObserver,
  ) {
    const writer = sources.findWriter();
    const writes = writer ? [onWriterChange(writer, () => this.written())] : [];

    this.subscriptions = [
      sources.open.subscribe({ next: () => this.opened() }),
      ...writes,
    ];
    this.opened();
  }

  public stop(): void {
    for (const subscription of this.subscriptions) subscription.unsubscribe();

    for (const id of this.following.keys()) this.unfollow(id);

    for (const observer of this.observers.values()) observer.stop?.();
    this.observers.clear();
  }

  private opened(): void {
    const now = new Set(this.sources.open.ids());

    for (const id of this.checked) {
      if (now.has(id)) continue;
      this.checked.delete(id);
      this.unfollow(id);
    }

    for (const id of this.unwritten)
      if (!now.has(id)) this.unwritten.delete(id);

    for (const id of now) this.openedOne(id);
  }

  private openedOne(id: string): void {
    const following = this.following.get(id);

    if (following && following.actor === this.sources.open.session(id)) return;

    if (following) this.unfollow(id);

    const observer = this.observers.get(id);

    if (observer) return this.follow(id, observer);

    if (!this.checked.has(id) && !this.unwritten.has(id)) this.enroll(id);
  }

  private unfollow(id: string): void {
    this.following.get(id)?.subscription.unsubscribe();
    this.following.delete(id);
  }

  private written(): void {
    for (const id of this.unwritten) this.enroll(id);
  }

  private enroll(id: string): void {
    const row = rowOf(this.sources, id);

    if (!row) {
      this.unwritten.add(id);

      return;
    }

    this.unwritten.delete(id);
    this.checked.add(id);

    if (row.startedBySessionId !== this.starterId) return;
    const observer = this.observe(id);

    this.observers.set(id, observer);
    this.follow(id, observer);
  }

  private follow(id: string, observer: StartedSessionObservation): void {
    const actor = this.sources.open.session(id);

    if (!actor) return;

    this.checked.add(id);
    this.following.set(id, { actor, subscription: observer.follow(actor) });
  }
}

// Watches direct Started Sessions, including those already open, until the returned function is called.
export function watchStartedSessions(
  sources: OpenedSources,
  starterId: string,
  observer: StartedSessionObserver,
): () => void {
  const watch = new StartedSessionWatch(sources, starterId, observer);

  return (): void => watch.stop();
}
