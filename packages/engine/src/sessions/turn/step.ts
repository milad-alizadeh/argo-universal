import type { ContentBlock } from '@repo/contracts';
import type { FeedActorRef, FeedEvent, FeedTurnEnding } from '../../feed';
import type { AcpTurnOutcome } from '../acp/prompts/prompt-outcome';
import type { SessionContext, SessionWrite } from '../session-context';

// What a Turn ended with, as the Agent reported it or as the Engine found it.
export type EndTurnParameters = AcpTurnOutcome;

export type StartTurnParameters = { turnId: string; content: ContentBlock[] };

// How an Agent crash ended a Turn.
export type CrashEnding = Extract<FeedTurnEnding, { kind: 'agent_crash' }>;

// A Subagent's Turn that a step ended: the event for its Feed, then the write that stores it.
export type SubagentTurnEnd = {
  feed: FeedActorRef;
  event: FeedEvent;
  write: SessionWrite;
};

/*
 * What one Turn step does: its change to the Session (only the fields it sets), what it asks the writer to
 * store, and what it tells the Feeds. A Subagent's Feed hears its Turn end before the write is queued.
 */
export type TurnStep<Change = Partial<SessionContext>> = {
  change?: Change;
  writes: SessionWrite[];
  // For the Session's own Feed.
  feed: FeedEvent[];
  subagentTurns: SubagentTurnEnd[];
};

export const turnStep = <Change>(
  step: Partial<TurnStep<Change>>,
): TurnStep<Change> => ({
  writes: [],
  feed: [],
  subagentTurns: [],
  ...step,
});
