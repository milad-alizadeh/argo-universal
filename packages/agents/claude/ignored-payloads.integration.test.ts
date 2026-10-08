import path from 'node:path';
import { expect, it } from 'vitest';
import { readRecording } from '../mocks/recording';
import { dictionary } from './dictionary';
import type { SDKMessage } from './messages';
import { initialMappingState, toAgentEvents } from './to-agent-events';
import { isIgnoredCliExtension, isVendorMessage } from './wire';

const directory = path.join(
  import.meta.dirname,
  '../../../mocks/cli/claude/recordings',
);
const recording = dictionary(
  JSON.parse(readRecording(directory, 'edit-and-command')),
);
const output = dictionary(recording.payload).output;
if (!Array.isArray(output)) throw new Error('Missing recorded messages');
const stream = output.find(
  (value): value is Extract<SDKMessage, { type: 'stream_event' }> =>
    isVendorMessage(value) && value.type === 'stream_event',
);
if (!stream) throw new Error('Missing recorded stream');

it.each([
  { type: 'command_lifecycle' },
  { type: 'system', subtype: 'post_turn_summary' },
  { type: 'system', subtype: 'session_title_changed' },
])(
  'recognises the approved ignored CLI extension $type/$subtype',
  (tag): void => {
    expect(isIgnoredCliExtension(tag)).toBe(true);
  },
);

it('ignores the SDK compaction delta without creating a rejection', (): void => {
  const state = initialMappingState();
  const result = toAgentEvents(
    {
      ...stream,
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
