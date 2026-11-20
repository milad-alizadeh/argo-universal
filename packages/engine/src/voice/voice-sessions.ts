import { randomUUID } from 'node:crypto';
import type { FeedUpdate } from '@repo/contracts';
import type { FeedEvent } from '../feed';
import type { TurnHappening } from '../sessions';
import { FeedWatch, type FeedSources } from './feed-watch';
import type {
  PromptOutcome,
  SessionHappening,
  VoiceNotice,
  VoiceSessions,
} from './session-link';
import { StartedAgents } from './started-agents';
import { StartedSessions, type StartedSources } from './started-watch';

type Listener = (happening: SessionHappening) => void;

/*
 * What the Voice call reaches its Session's work through: where a Prompt from the call lands, and what the Session
 * reports of its Turns until the returned function is called.
 */
export interface VoiceSessionWork extends StartedSources {
  prompt: (sessionId: string, text: string) => Promise<PromptOutcome>;
  stop: VoiceSessions['stop'];
  capture: VoiceSessions['capture'];
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

// The call's Session's words and Input requests, and the Agents it started, read from its Feed and snapshots.
function watchWords(
  sources: FeedSources,
  sessionId: string,
  listener: Listener,
): FeedWatch {
  const agents = new StartedAgents(listener);

  return new FeedWatch(sources, {
    sessionId,
    listener,
    snapshotted: (snapshot) => agents.changed(snapshot),
  });
}

// Each Turn's end, from the Session itself.
const watchEnds = (
  work: VoiceSessionWork,
  sessionId: string,
  listener: Listener,
): (() => void) =>
  work.watchTurns(sessionId, (happening) => {
    const ended = endOf(happening);

    if (ended) listener(ended);
  });

/*
 * The Agent's words come from the Session's Feed, and each Turn's end from the Session itself. The Agents and Sessions
 * it started are watched as well, so the voice hears when one finishes, fails or waits on the person (ADR-0064).
 */
const watchOf =
  (sources: FeedSources, work: VoiceSessionWork): VoiceSessions['watch'] =>
  (sessionId, listener) => {
    const words = watchWords(sources, sessionId, listener);
    const turns = watchEnds(work, sessionId, listener);

    const started = new StartedSessions(
      { ...sources, ...work },
      sessionId,
      listener,
    );

    return (): void => {
      started.stop();
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
