import type { Subagent } from '@repo/contracts';

export const subagentNow = 1_800_000_000_000;

const parentSessionId = 'parent-session';

// The one child a Session runs: the Subagents list and the Feed's Subagent rows name the same one.
export const runningSubagent: Subagent = {
  sessionId: 'subagent-readers',
  parentSessionId,
  readOnly: true,
  toolCallId: 'tool-readers',
  title: 'Find every Feed reader',
  role: 'Explore',
  model: 'Sonnet 4.5',
  state: 'running',
  stopReason: null,
  startedAt: subagentNow - 34_000,
  endedAt: null,
  durationMs: null,
  tokens: 8_200,
};

const requiresAction: Subagent = {
  ...runningSubagent,
  sessionId: 'subagent-tokens',
  toolCallId: 'tool-tokens',
  title: 'Migrate tokens to kit roles',
  model: 'Opus 4.5',
  role: 'General',
  state: 'requires_action',
  startedAt: subagentNow - 62_000,
  tokens: 21_400,
};

const finished: Subagent = {
  ...runningSubagent,
  sessionId: 'subagent-plan',
  toolCallId: 'tool-plan',
  title: 'Draft the Plan schema',
  model: 'Haiku 4.5',
  role: 'Plan',
  state: 'idle',
  stopReason: 'end_turn',
  startedAt: subagentNow - 138_000,
  endedAt: subagentNow,
  durationMs: 138_000,
  tokens: 12_900,
};

const cancelled: Subagent = {
  ...finished,
  sessionId: 'subagent-cli',
  toolCallId: 'tool-cli',
  title: 'Port the mock CLIs',
  role: 'Test',
  stopReason: 'cancelled',
  durationMs: 12_000,
  tokens: 1_300,
};

export const subagentStates = {
  none: [] satisfies Subagent[],
  oneRunning: [runningSubagent],
  severalMixed: [runningSubagent, requiresAction, finished, cancelled],
  allFinished: [finished, cancelled],
};

export const interleavedSubagents = [
  runningSubagent,
  finished,
  requiresAction,
  cancelled,
];
