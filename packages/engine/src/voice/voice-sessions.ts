import { randomUUID } from 'node:crypto';
import type { FeedSubscribeOutput, FeedUpdate } from '@repo/contracts';
import type { FeedDeps, FeedEvent } from '../feed';
import type { TurnHappening } from '../sessions';
import { FeedHappenings } from './feed-happenings';
import { PermissionWatch } from './permission-watch';
import type {
  PromptOutcome,
  SessionHappening,
  VoiceNotice,
  VoiceSessions,
} from './session-link';

type FeedSources = Pick<FeedDeps, 'findFeed' | 'watchSessionSnapshot'>;

type FeedActor = NonNullable<ReturnType<FeedSources['findFeed']>>;

type Listener = (happening: SessionHappening) => void;

type Stoppable = { unsubscribe: () => void };

type SnapshotEvent = Extract<
  FeedSubscribeOutput,
  { type: 'snapshot' | 'closed' }
>;

/*
 * What the Voice call reaches its Session's work through: where a Prompt from the call lands, and what the Session
 * reports of its Turns until the returned function is called.
 */
export interface VoiceSessionWork {
  prompt: (sessionId: string, text: string) => Promise<PromptOutcome>;
  stop: VoiceSessions['stop'];
  capture: VoiceSessions['capture'];
  watchTurns: (
    sessionId: string,
    listener: (happening: TurnHappening) => void,
  ) => () => void;
}

// Listens to one Session's Feed for the Agent's and the person's words, following it when the Session replaces its Feed actor, and to its Permission requests.
class FeedWatch {
  private readonly happenings = new FeedHappenings();
  private readonly permissions: PermissionWatch;
  private feed: FeedActor | undefined;
  private batches: Stoppable | undefined;
  private readonly snapshots: Stoppable;

  public constructor(
    private readonly sources: FeedSources,
    private readonly sessionId: string,
    private readonly listener: Listener,
  ) {
    this.permissions = new PermissionWatch(listener);
    this.follow();
    this.snapshots = sources.watchSessionSnapshot(sessionId, {
      next: (event): void => this.changed(event),
    });
  }

  public stop(): void {
    this.snapshots.unsubscribe();
    this.batches?.unsubscribe();
  }

  private changed(event: SnapshotEvent): void {
    this.follow();

    if (event.type === 'snapshot')
      this.permissions.changed(event.snapshot.pendingPermission);
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
      for (const happening of this.happenings.read(batch.events))
        this.listener(happening);
    });
  }
}

type NoticeUpdate = Extract<FeedUpdate, { sessionUpdate: 'notice' }>;

const noticeUpdate = ({ title, description }: VoiceNotice): NoticeUpdate => ({
  id: randomUUID(),
  sessionUpdate: 'notice',
  state: 'settled',
  severity: 'warning',
  title,
  description,
});

// A settled warning Notice, written outside any Turn.
const noticeEvent = (notice: VoiceNotice): FeedEvent => ({
  type: 'feed.change',
  turnId: null,
  blobs: [],
  change: { type: 'upsert', update: noticeUpdate(notice) },
});

// The Turn's end the voice is told of; which Prompt a Turn took stays with the Prompt's own answer.
const endOf = (happening: TurnHappening): SessionHappening | undefined =>
  happening.type === 'turn.ended'
    ? {
        type: 'turn.ended',
        stopReason: happening.stopReason,
        error: happening.error,
      }
    : undefined;

// The Agent's words come from the Session's Feed, and each Turn's end from the Session itself.
const watchOf =
  (sources: FeedSources, work: VoiceSessionWork): VoiceSessions['watch'] =>
  (sessionId, listener) => {
    const words = new FeedWatch(sources, sessionId, listener);

    const turns = work.watchTurns(sessionId, (happening) => {
      const ended = endOf(happening);

      if (ended) listener(ended);
    });

    return (): void => {
      turns();
      words.stop();
    };
  };

// Writes a Notice into a Session's Feed, outside any Turn; the Voice call and a screen capture both write theirs this way.
export const feedNotices =
  (sources: Pick<FeedSources, 'findFeed'>): VoiceSessions['notice'] =>
  (sessionId, notice) =>
    sources.findFeed(sessionId)?.send(noticeEvent(notice));

// The Session the Voice call speaks for, reached through the Engine's own Prompt path, its Turn happenings and its Feed.
export const voiceSessions = (
  sources: FeedSources,
  work: VoiceSessionWork,
): VoiceSessions => ({
  prompt: work.prompt,
  stop: work.stop,
  capture: work.capture,
  watch: watchOf(sources, work),
  notice: feedNotices(sources),
});
