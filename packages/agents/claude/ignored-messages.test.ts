import { expect, it } from 'vitest';
import type { VendorMessage } from './messages';
import { mapAll } from './mocks/mapping';
import { assistant, user } from './mocks/sdk-messages';
import { initialMappingState } from './to-agent-events';
it.each([
  [
    'the interrupt marker',
    user([{ type: 'text', text: '[Request interrupted by user]' }]),
  ],
  [
    'a synthetic user message',
    {
      ...user('Injected context.'),
      isSynthetic: true,
    },
  ],
  [
    "a Subagent's message",
    {
      ...assistant('sub-1', [{ type: 'text', text: 'Hi', citations: [] }]),
      parent_tool_use_id: 'toolu_task',
      uuid: '00000000-0000-0000-0000-000000000003',
      session_id: 'vendor-1',
    },
  ],
] satisfies [string, VendorMessage][])('drops %s', (_, message): void => {
  expect(mapAll([message])).toEqual({
    events: [],
    mappingState: initialMappingState(),
  });
});
