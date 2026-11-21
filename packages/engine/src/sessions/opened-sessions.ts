import type { Subscription } from 'xstate';
import type { SessionActorRef } from './session-machine';
import type { HandlerSources } from './session-sources';
import type { TurnHappening } from './turn-happenings';
import { onWriterChange } from './writer-changes';

type OpenedSources = HandlerSources<
  'findWriter',
  'queued' | 'ids' | 'session' | 'subscribe'
>;

type TurnEnded = Extract<TurnHappening, { type: 'turn.ended' }>;

type ObservationLifetime =
  | { retain?: false }
  | { retain: true; stop: () => void };

// Domain events from one direct Started Session. Only retained observers survive a close.
export type StartedSessionObservation = {
  availability?: (open: boolean) => void;
  changed?: () => void;
  turnEnded?: (happening: TurnEnded) => void;
} & ObservationLifetime;

export type StartedSessionObserver = (
  sessionId: string,
) => StartedSessionObservation;

type Row = ReturnType<OpenedSources['open']['queued']>;

type FollowedSession = {
  actor: SessionActorRef;
  observer: StartedSessionObservation;
  subscriptions: Subscription[];
};

// A Session's row includes the Writer's queued insert, once it exists.
function rowOf(sources: OpenedSources, sessionId: string): Row | undefined {
  try {
    return sources.open.queued(sessionId);
  } catch {
    return undefined;
  }
}

function subscribeToSession(
  actor: SessionActorRef,
  { changed, turnEnded }: StartedSessionObservation,
): Subscription[] {
  const state = changed
    ? [actor.subscribe({ next: changed, complete: changed })]
    : [];

  const turns = turnEnded ? [actor.on('turn.ended', turnEnded)] : [];

  return [...state, ...turns];
}

/*
 * Follow direct Started Sessions once their origin can be read. All subscriptions
 * follow the actor lifetime. Conversation state can survive until the watch stops.
 */
class StartedSessionWatch {
  private readonly checked = new Set<string>();
  private readonly unwritten = new Set<string>();
  private readonly retained = new Map<
    string,
    StartedSessionObservation & { retain: true }
  >();
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

    for (const observer of this.retained.values()) observer.stop();
    this.retained.clear();
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
    const actor = this.sources.open.session(id);
    const previous = this.following.get(id);

    if (previous && previous.actor === actor) return;

    if (previous) this.unfollow(id);

    if (!actor) return;

    const observer = this.retained.get(id);

    if (observer) return this.follow(id, actor, observer);

    if (!this.checked.has(id) && !this.unwritten.has(id))
      this.enroll(id, actor);
  }

  private unfollow(id: string): void {
    const followed = this.following.get(id);

    if (!followed) return;

    this.following.delete(id);
    this.checked.delete(id);

    for (const subscription of followed.subscriptions)
      subscription.unsubscribe();
    followed.observer.availability?.(false);
  }

  private written(): void {
    for (const id of this.unwritten) {
      const actor = this.sources.open.session(id);

      if (actor) this.enroll(id, actor);
    }
  }

  private enroll(id: string, actor: SessionActorRef): void {
    const row = rowOf(this.sources, id);

    if (!row) {
      this.unwritten.add(id);

      return;
    }

    this.unwritten.delete(id);
    this.checked.add(id);

    if (row.startedBySessionId !== this.starterId) return;

    const observer = this.observe(id);

    if (observer.retain) this.retained.set(id, observer);
    this.follow(id, actor, observer);
  }

  private follow(
    id: string,
    actor: SessionActorRef,
    observer: StartedSessionObservation,
  ): void {
    const subscriptions = subscribeToSession(actor, observer);

    this.checked.add(id);
    this.following.set(id, { actor, observer, subscriptions });
    observer.availability?.(true);
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
