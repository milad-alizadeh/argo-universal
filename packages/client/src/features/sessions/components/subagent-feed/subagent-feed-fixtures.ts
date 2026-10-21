import type { SubagentFeedProps } from './subagent-feed';
import {
  emptyFeed,
  finishedFeed,
  finishedSubagent,
  noIncomingFeed,
  runningFeed,
  runningSubagent,
  startingSubagent,
  subagentFeedNow,
} from './subagent-feed.mocks';

// A story supplies onBack; a fixture is the Subagent and the Feed its child Session reported.
type SubagentFeedFixture = Omit<SubagentFeedProps, 'onBack'>;

export const runningSubagentFeed = {
  subagent: runningSubagent,
  feed: runningFeed,
  now: subagentFeedNow,
} satisfies SubagentFeedFixture;

export const finishedSubagentFeed = {
  subagent: finishedSubagent,
  feed: finishedFeed,
  now: subagentFeedNow,
} satisfies SubagentFeedFixture;

// Just spawned: nothing reported yet, so only the live row shows.
export const emptySubagentFeed = {
  subagent: startingSubagent,
  feed: emptyFeed,
  now: subagentFeedNow,
} satisfies SubagentFeedFixture;

// The Agent reported no incoming view, so the Feed starts with the child's own output.
export const noIncomingMessageFeed = {
  ...runningSubagentFeed,
  feed: noIncomingFeed,
} satisfies SubagentFeedFixture;
