import type { Subagent } from '@repo/contracts';

export const subagentNow = 1_800_000_000_000;

const parentSessionId = 'parent-session';

const running: Subagent = {
  sessionId: 'subagent-readers',
  parentSessionId,
  toolCallId: 'tool-readers',
  title: 'Find every Feed reader',
  role: null,
  model: 'Sonnet 4.5',
  state: 'running',
  stopReason: null,
  startedAt: subagentNow - 34_000,
  endedAt: null,
  durationMs: null,
  tokens: 8_200,
};

const requiresAction: Subagent = {
  ...running,
  sessionId: 'subagent-tokens',
  toolCallId: 'tool-tokens',
  title: 'Migrate tokens to kit roles',
  model: 'Opus 4.5',
  state: 'requires_action',
  startedAt: subagentNow - 62_000,
  tokens: 21_400,
};

const finished: Subagent = {
  ...running,
  sessionId: 'subagent-plan',
  toolCallId: 'tool-plan',
  title: 'Draft the Plan schema',
  model: 'Haiku 4.5',
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
  stopReason: 'cancelled',
  durationMs: 12_000,
  tokens: 1_300,
};

export const subagentStates = {
  none: [] satisfies Subagent[],
  oneRunning: [running],
  severalMixed: [running, requiresAction, finished, cancelled],
  allFinished: [finished, cancelled],
};
