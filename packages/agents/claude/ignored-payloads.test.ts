import { expect, it } from 'vitest';
import { initialMappingState, toAgentEvents } from './to-agent-events';

it.each([
  { type: 'command_lifecycle' },
  { type: 'system', subtype: 'post_turn_summary' },
  { type: 'system', subtype: 'session_title_changed' },
])(
  'keeps the known CLI extension $type/$subtype outside the Feed',
  (tag): void => {
    const state = initialMappingState();
    const result = toAgentEvents(
      {
        ...tag,
        uuid: '0c727db1-a8bd-42ae-8a88-977412e3904b',
        session_id: '2183a8db-1864-4351-8558-5ae19a92f3d7',
      },
      state,
    );
    expect(result).toEqual({ events: [], mappingState: state });
  },
);

it('accepts SDK tool stream placeholders before their input arrives', (): void => {
  const state = initialMappingState();
  const result = toAgentEvents(
    {
      type: 'stream_event',
      event: {
        type: 'content_block_start',
        index: 0,
        content_block: {
          type: 'tool_use',
          id: 'tool',
          name: 'Write',
          input: {},
        },
      },
    },
    state,
  );
  expect(result).toEqual({ events: [], mappingState: state });
});
it('accepts SDK tool references inside a recorded tool result', (): void => {
  const state = initialMappingState();
  const result = toAgentEvents(
    {
      type: 'user',
      message: {
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tool',
            content: [{ type: 'tool_reference', tool_name: 'Write' }],
          },
        ],
      },
    },
    state,
  );
  expect(result).toEqual({ events: [], mappingState: state });
});
