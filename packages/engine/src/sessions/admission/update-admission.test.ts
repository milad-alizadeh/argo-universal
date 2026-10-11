import { expect, it } from 'vitest';
import { isReplayedHistory } from './update-admission';

it.each([
  'user_message_chunk',
  'agent_message_chunk',
  'agent_thought_chunk',
  'tool_call',
  'tool_call_update',
  'plan',
])(
  'treats %s for a resumed Agent session as replayed history',
  (kind): void => {
    expect(isReplayedHistory('agent-session-1', kind)).toBe(true);
  },
);

it.each(['config_option_update', 'available_commands_update', 'usage_update'])(
  'admits %s for a resumed Agent session as new',
  (kind): void => {
    expect(isReplayedHistory('agent-session-1', kind)).toBe(false);
  },
);

it('admits conversation updates before the Agent session exists', (): void => {
  expect(isReplayedHistory(null, 'agent_message_chunk')).toBe(false);
});
