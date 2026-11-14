import type { SubagentListProps } from './subagent-list';
import { subagentNow, subagentStates } from './subagent-list.mocks';

// A story supplies onSelect; a fixture is the Session's Subagents and the clock they read against.
type SubagentListFixture = Omit<SubagentListProps, 'onSelect'>;

// One Subagent per state the rows draw: running, needs input, finished and cancelled.
export const severalMixedSubagents = {
  subagents: subagentStates.severalMixed,
  now: subagentNow,
} satisfies SubagentListFixture;

export const oneRunningSubagent = {
  subagents: subagentStates.oneRunning,
  now: subagentNow,
} satisfies SubagentListFixture;

export const allFinishedSubagents = {
  subagents: subagentStates.allFinished,
  now: subagentNow,
} satisfies SubagentListFixture;

export const noSubagents = {
  subagents: subagentStates.none,
  now: subagentNow,
} satisfies SubagentListFixture;
