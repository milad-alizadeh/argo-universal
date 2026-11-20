import type { SessionSnapshot } from '@repo/contracts';
import { readConversationSections } from '../feed';
import type { TurnHappening } from '../sessions';
import { FeedWatch, type WatchSources } from './feed-watch';
import type { SessionHappening } from './session-link';

type Listener = (happening: SessionHappening) => void;

type TurnEnded = Extract<TurnHappening, { type: 'turn.ended' }>;

// What the call needs to find the Sessions its Session started and follow their Turns.
export interface StartedSources {
  watchTurns: (
    sessionId: string,
    listener: (happening: TurnHappening) => void,
  ) => () => void;
  // Hears each Session as it opens, those open now first, with the Session that started it; returns how to stop.
  watchOpened: (
    listener: (sessionId: string, startedBy: string | null) => void,
  ) => () => void;
}

type Sources = WatchSources & StartedSources;

type Waiting = Pick<
  Extract<SessionHappening, { type: 'started.waiting' }>,
  'request' | 'what'
>;

/*
 * How long a Turn's end waits before it is told: the Feed settles the Turn's last message as the Turn ends, and the
 * end is told with that message once the Feed has caught up.
 */
const settleMs = 300;

// What the voice may say of an Agent message: everything but silent analysis.
const sayable = (text: string): string =>
  readConversationSections(text)
    .filter(({ kind }) => kind !== 'analysis')
    .map(({ body }) => body)
    .join('\n');

const waitingOf = (happening: SessionHappening): Waiting | undefined => {
  switch (happening.type) {
    case 'permission.waiting':
      return { request: 'permission', what: happening.title };
    case 'elicitation.waiting':
      return { request: 'elicitation', what: happening.message };
    default:
      return undefined;
  }
};

// A Turn the person or its starter stopped is no news to tell.
const cancelled = ({ stopReason, error }: TurnEnded): boolean =>
  stopReason === 'cancelled' && error === null;

/*
 * One Session that the Conversation's Session started (ADR-0064): the voice hears when it waits on the person and when a Turn
 * of it ends, with what its Agent said last. Its words themselves are not passed on.
 */
class StartedSession {
  private title = 'A Started Session';
  private last: string | null = null;
  private readonly feed: FeedWatch;
  private turns: () => void = () => {};
  private readonly ends = new Set<ReturnType<typeof setTimeout>>();

  public constructor(
    private readonly sources: Sources,
    private readonly sessionId: string,
    private readonly listener: Listener,
  ) {
    this.feed = new FeedWatch(sources, {
      sessionId,
      listener: (happening): void => this.heard(happening),
      snapshotted: (snapshot): void => this.named(snapshot),
    });
    this.follow();
  }

  // Hears the Session's Turns, again when it closed and opened again; what it already said waits stays said.
  public follow(): void {
    this.turns();
    this.turns = this.sources.watchTurns(this.sessionId, (happening) => {
      if (happening.type === 'turn.ended') this.settling(happening);
    });
  }

  public stop(): void {
    for (const end of this.ends) clearTimeout(end);
    this.turns();
    this.feed.stop();
  }

  private named({ title }: SessionSnapshot): void {
    if (title) this.title = title;
  }

  private heard(happening: SessionHappening): void {
    if (happening.type === 'agent.message') return this.said(happening.text);
    const waiting = waitingOf(happening);

    if (waiting)
      this.listener({ type: 'started.waiting', title: this.title, ...waiting });
  }

  private said(text: string): void {
    const said = sayable(text);

    if (said) this.last = said;
  }

  private settling(ended: TurnEnded): void {
    const end = setTimeout(() => {
      this.ends.delete(end);
      this.ended(ended);
    }, settleMs);

    this.ends.add(end);
  }

  private ended(ended: TurnEnded): void {
    const { title, last } = this;
    this.last = null;

    if (cancelled(ended)) return;

    const { stopReason, error } = ended;
    this.listener({ type: 'started.ended', title, last, stopReason, error });
  }
}

// Follows each Session the Conversation's Session started, from those open now to those started during the call.
export class StartedSessions {
  private readonly watched = new Map<string, StartedSession>();
  private readonly stopOpened: () => void;

  public constructor(
    private readonly sources: Sources,
    private readonly starterId: string,
    private readonly listener: Listener,
  ) {
    this.stopOpened = sources.watchOpened((sessionId, startedBy) => {
      if (startedBy === starterId) this.opened(sessionId);
    });
  }

  public stop(): void {
    this.stopOpened();

    for (const session of this.watched.values()) session.stop();
  }

  private opened(sessionId: string): void {
    const known = this.watched.get(sessionId);

    if (known) return known.follow();
    this.watched.set(
      sessionId,
      new StartedSession(this.sources, sessionId, this.listener),
    );
  }
}
