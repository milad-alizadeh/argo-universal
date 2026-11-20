import { expect, it } from 'vitest';
import {
  runningSubagent,
  subagentNow,
} from '../subagent-list/subagent-list.mocks';
import { subagentFeedMeta } from './subagent-feed-meta';

const ended = {
  ...runningSubagent,
  state: 'idle' as const,
  endedAt: subagentNow,
  durationMs: 101_000,
};

it.each([
  ['counts up while running', runningSubagent, 'Running · Sonnet 4.5 · 34s'],
  [
    'settles on its duration when finished',
    { ...ended, stopReason: 'end_turn' as const },
    'Finished · Sonnet 4.5 · 1m 41s',
  ],
  [
    'names a stop part way',
    { ...ended, stopReason: 'cancelled' as const },
    'Cancelled · Sonnet 4.5 · 1m 41s',
  ],
  [
    'leaves out a model the Agent did not send',
    { ...runningSubagent, model: null },
    'Running · 34s',
  ],
  [
    'names only that it waits on you',
    { ...runningSubagent, state: 'requires_action' as const },
    'Needs input · Sonnet 4.5',
  ],
])('%s', (_case, subagent, line) => {
  expect(subagentFeedMeta(subagent, subagentNow)).toBe(line);
});
