import { expect, it } from 'vitest';
import { isKnownMessage } from './known-messages';
import { stream } from './mocks/sdk-messages';
import { initialMappingState, toAgentEvents } from './to-agent-events';

const message = stream({ type: 'message_stop' });

it('ignores the SDK compaction delta without creating a rejection', (): void => {
  const state = initialMappingState();
  const result = toAgentEvents(
    {
      ...message,
      event: {
        type: 'content_block_delta',
        index: 0,
        delta: {
          type: 'compaction_delta',
          content: null,
          encrypted_content: null,
        },
      },
    },
    state,
  );
  expect(result).toEqual({ events: [], mappingState: state });
});

it('ignores the SDK file image source without rejecting its message', (): void => {
  const state = initialMappingState();
  const result = toAgentEvents(
    {
      type: 'user',
      parent_tool_use_id: null,
      message: {
        role: 'user',
        content: [{ type: 'image', source: { type: 'file', file_id: 'file' } }],
      },
    },
    state,
  );
  expect(result).toEqual({ events: [], mappingState: state });
});

const knownExtensions = [
  { type: 'command_lifecycle' },
  { type: 'system', subtype: 'post_turn_summary' },
  { type: 'system', subtype: 'session_title_changed' },
];
it.each(knownExtensions)(
  'accepts the approved $type/$subtype extension tag',
  (extension): void => {
    expect(Reflect.apply(isKnownMessage, undefined, [extension])).toBe(true);
  },
);
it.each(knownExtensions)(
  'ignores the approved $type/$subtype extension payload',
  (extension): void => {
    const state = initialMappingState();
    expect(Reflect.apply(toAgentEvents, undefined, [extension, state])).toEqual(
      { events: [], mappingState: state },
    );
  },
);
