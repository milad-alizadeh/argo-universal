import { expect, it } from 'vitest';
import { subagentSupporting } from './subagent-format';
import { runningSubagent, subagentNow } from './subagent-list.mocks';

// An Agent that sends no model or token count, as Claude's does.
const unreported = { ...runningSubagent, model: null, tokens: null };

it.each([
  ['running', unreported, '34s'],
  [
    'waiting on you',
    { ...unreported, state: 'requires_action' as const },
    'Needs input',
  ],
  [
    'finished',
    {
      ...unreported,
      state: 'idle' as const,
      stopReason: 'end_turn' as const,
      durationMs: 10_000,
    },
    'Finished · 10s',
  ],
])(
  'leaves out what the Agent did not send while %s',
  (_state, subagent, line) => {
    expect(subagentSupporting(subagent, subagentNow)).toBe(line);
  },
);

it('names the model and tokens the Agent sent', () => {
  expect(subagentSupporting(runningSubagent, subagentNow)).toBe(
    'Sonnet 4.5 · 34s · 8.2k tokens',
  );
});
