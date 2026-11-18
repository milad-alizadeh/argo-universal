import { randomUUID } from 'node:crypto';
import type { FeedUpdate } from '@repo/contracts';
import type { FeedDeps, FeedEvent } from '../feed';
import { FeedHappenings } from './feed-happenings';
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

// What a Session does with a Prompt from the Voice call.
export type VoicePrompts = (
  sessionId: string,
  text: string,
) => Promise<PromptOutcome>;

// Listens to one Session's Feed, following it when the Session replaces its Feed actor.
class FeedWatch {
  private readonly happenings = new FeedHappenings();
  private feed: FeedActor | undefined;
  private batches: Stoppable | undefined;
  private readonly snapshots: Stoppable;

  public constructor(
    private readonly sources: FeedSources,
    private readonly sessionId: string,
    private readonly listener: Listener,
  ) {
    this.follow();
    this.snapshots = sources.watchSessionSnapshot(sessionId, {
      next: (): void => this.follow(),
    });
  }

  public stop(): void {
    this.snapshots.unsubscribe();
    this.batches?.unsubscribe();
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

const watchOf =
  (sources: FeedSources): VoiceSessions['watch'] =>
  (sessionId, listener) => {
    const watch = new FeedWatch(sources, sessionId, listener);

    return (): void => watch.stop();
  };

// The Session the Voice call speaks for, reached through the Engine's own Prompt path and Feed.
export const voiceSessions = (
  sources: FeedSources,
  prompt: VoicePrompts,
): VoiceSessions => ({
  prompt,
  watch: watchOf(sources),
  notice: (sessionId, notice) =>
    sources.findFeed(sessionId)?.send(noticeEvent(notice)),
});
