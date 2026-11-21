import { randomUUID } from 'node:crypto';
import type { FeedUpdate } from '@repo/contracts';
import type { FeedEvent } from '../feed';
import type {
  ConversationSessionWork as SessionWork,
  TurnHappening,
} from '../sessions';
import { FeedWatch, type FeedSources, type WatchSources } from './feed-watch';
import type {
  SessionHappening,
  ConversationNotice,
  ConversationSessions,
} from './session-link';
import { StartedAgents } from './started-agents';
import { watchStartedSessionSpeech } from './started-watch';

type Listener = (happening: SessionHappening) => void;

// What the Conversation reaches its Session's work through: the Engine's own Sessions, and a picture of the screen.
export type ConversationSessionWork = Pick<
  SessionWork,
  | 'promptFromConversation'
  | 'stopFromConversation'
  | 'answerFromConversation'
  | 'watchTurns'
  | 'watchStarted'
  | 'agentName'
> &
  Pick<ConversationSessions, 'capture'>;

type NoticeUpdate = Extract<FeedUpdate, { sessionUpdate: 'notice' }>;

const noticeUpdate = ({
  title,
  description,
}: ConversationNotice): NoticeUpdate => ({
  id: randomUUID(),
  sessionUpdate: 'notice',
  state: 'settled',
  severity: 'warning',
  title,
  description,
});

// A settled warning Notice, written outside any Turn.
const noticeEvent = (notice: ConversationNotice): FeedEvent => ({
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
  sources: WatchSources,
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
  work: ConversationSessionWork,
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
  (
    sources: FeedSources,
    work: ConversationSessionWork,
  ): ConversationSessions['watch'] =>
  (sessionId, listener) => {
    const watching = { ...sources, ...work };
    const words = watchWords(watching, sessionId, listener);
    const turns = watchEnds(work, sessionId, listener);

    const stopStarted = watchStartedSessionSpeech(
      watching,
      sessionId,
      listener,
    );

    return (): void => {
      stopStarted();
      turns();
      words.stop();
    };
  };

// Writes a Notice into a Session's Feed, outside any Turn; the Conversation and a screen capture both write theirs this way.
export const feedNotices =
  (sources: Pick<FeedSources, 'findFeed'>): ConversationSessions['notice'] =>
  (sessionId, notice) =>
    sources.findFeed(sessionId)?.send(noticeEvent(notice));

// The Session the Conversation speaks for, reached through the Engine's own Prompt path, its Turn happenings and its Feed.
export const conversationSessions = (
  sources: FeedSources,
  work: ConversationSessionWork,
): ConversationSessions => ({
  prompt: (sessionId, text) => work.promptFromConversation(sessionId, text),
  stop: (sessionId) => work.stopFromConversation(sessionId),
  answer: async (sessionId, requestId, answer) =>
    work.answerFromConversation(sessionId, requestId, answer),
  capture: (sessionId) => work.capture(sessionId),
  watch: watchOf(sources, work),
  notice: feedNotices(sources),
});
