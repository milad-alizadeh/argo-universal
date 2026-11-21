import type { SessionSnapshot } from '@repo/contracts';
import { readConversationSections } from '../feed';
import type {
  ConversationSessionWork,
  StartedSessionObservation,
  TurnHappening,
} from '../sessions';
import { FeedWatch, type WatchSources } from './feed-watch';
import type { SessionHappening } from './session-link';

type Listener = (happening: SessionHappening) => void;

type TurnEnded = Extract<TurnHappening, { type: 'turn.ended' }>;

type Sources = WatchSources & Pick<ConversationSessionWork, 'watchStarted'>;

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
  private readonly ends = new Set<ReturnType<typeof setTimeout>>();

  public constructor(
    sources: WatchSources,
    sessionId: string,
    private readonly listener: Listener,
  ) {
    this.feed = new FeedWatch(sources, {
      sessionId,
      listener: (happening): void => this.heard(happening),
      snapshotted: (snapshot): void => this.named(snapshot),
    });
  }

  public readonly retain = true;

  public turnEnded: NonNullable<StartedSessionObservation['turnEnded']> = (
    happening,
  ) => this.settling(happening);

  public stop(): void {
    for (const end of this.ends) clearTimeout(end);
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

// Follows the direct Started Sessions that the Conversation speaks about.
export function watchStartedSessionSpeech(
  sources: Sources,
  starterId: string,
  listener: Listener,
): () => void {
  return sources.watchStarted(
    starterId,
    (sessionId) => new StartedSession(sources, sessionId, listener),
  );
}
