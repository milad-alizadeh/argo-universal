import { expect, it } from 'vitest';
import { isVendorMessage } from './wire';

it.each([
  { type: 'future_message' },
  { type: 'stream_event', event: { type: 'content_block_delta', delta: null } },
  {
    type: 'assistant',
    message: { id: 'message', content: [{ type: 'text', text: 42 }] },
  },
])('refuses malformed raw provider data $type', (payload): void => {
  expect(isVendorMessage(payload)).toBe(false);
});
