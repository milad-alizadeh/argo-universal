import type { ContentBlock } from '@repo/contracts';
import type { FeedActorRef, FeedEvent } from '../../feed';
import type { AcpTurnOutcome } from '../acp/prompts/prompt-outcome';
import type { SessionContext, SessionWrite } from '../session-context';

// What a Turn ended with, as the Agent reported it or as the Engine found it.
export type EndTurnParameters = AcpTurnOutcome;

export type StartTurnParameters = { turnId: string; content: ContentBlock[] };

// What one Turn step changes in the Session, what it asks the writer to store, and what it tells the Feeds.
export type TurnStep = {
  change: Partial<SessionContext>;
  writes: SessionWrite[];
  // For the Session's own Feed.
  feed: FeedEvent[];
  // For the Feed of each Subagent whose Turn the step ended.
  subagentFeeds: { feed: FeedActorRef; event: FeedEvent }[];
};

export const turnStep = (
  step: Pick<TurnStep, 'change'> & Partial<TurnStep>,
): TurnStep => ({
  writes: [],
  feed: [],
  subagentFeeds: [],
  ...step,
});
