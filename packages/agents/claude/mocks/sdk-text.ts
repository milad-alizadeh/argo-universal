import type { VendorMessage } from '../messages';
import { assistant, stream } from './sdk-messages';

export const thought: VendorMessage[] = [
  stream({
    type: 'message_start',
    message: assistant('msg_011CfiGV55PC6jDNmPmEHy8D', []).message,
  }),
  stream({
    type: 'content_block_start',
    index: 0,
    content_block: { type: 'thinking', thinking: '', signature: 'signature' },
  }),
  stream({
    type: 'content_block_delta',
    index: 0,
    delta: {
      type: 'thinking_delta',
      estimated_tokens: null,
      thinking:
        "I should read hello.txt before editing it, so I'll write notes.md and read hello.txt at the same time.\n\n",
    },
  }),
  {
    ...assistant('msg_011CfiGV55PC6jDNmPmEHy8D', [
      {
        type: 'thinking',
        thinking:
          "I should read hello.txt before editing it, so I'll write notes.md and read hello.txt at the same time.\n\n",
        signature: 'signature',
      },
    ]),
    timestamp: '2026-10-05T02:02:52.263Z',
  },
];

export const answer: VendorMessage[] = [
  stream({
    type: 'message_start',
    message: assistant('msg_011CfiGVZY9Xg3EPrTZnMaR5', []).message,
  }),
  stream({
    type: 'content_block_start',
    index: 0,
    content_block: { type: 'text', text: '', citations: [] },
  }),
  stream({
    type: 'content_block_delta',
    index: 0,
    delta: {
      type: 'text_delta',
      text: 'I created `notes.md` with a two-item todo list and changed `hello.txt` to read "hello Argo", and git status shows `hello.txt` as modified and `notes.md` as a new untracked file.',
    },
  }),
  {
    ...assistant('msg_011CfiGVZY9Xg3EPrTZnMaR5', [
      {
        type: 'text',
        citations: [],
        text: 'I created `notes.md` with a two-item todo list and changed `hello.txt` to read "hello Argo", and git status shows `hello.txt` as modified and `notes.md` as a new untracked file.',
      },
    ]),
    timestamp: '2026-10-05T02:02:57.632Z',
  },
];
