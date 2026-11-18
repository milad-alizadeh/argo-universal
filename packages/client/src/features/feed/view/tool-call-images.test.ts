import type { BlobRef, ToolCallUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
import type { FeedGroup } from './feed-view';
import { groupImages, toolCallImages, withoutImages } from './tool-call-images';

const blob = (blobId: string): BlobRef => ({
  blobId,
  mime: 'image/png',
  bytes: 4,
});

const read = (id: string, path: string, blobId?: string): ToolCallUpdate => ({
  id,
  sessionId: 's',
  position: 0,
  revision: 1,
  turnId: null,
  toolCallId: id,
  sessionUpdate: 'tool_call_update',
  state: 'settled',
  title: `Read ${path}`,
  kind: 'read',
  status: 'completed',
  locations: [{ path }],
  rawInput: { file_path: path },
  content: blobId
    ? [
        {
          type: 'content',
          content: { type: 'image', mimeType: 'image/png', blob: blob(blobId) },
        },
      ]
    : [{ type: 'content', content: { type: 'text', text: 'export {}' } }],
});

it('names a read image after its file', () => {
  expect(toolCallImages(read('a', '/repo/docs/before.png', 'b1'))).toEqual([
    {
      type: 'image',
      mimeType: 'image/png',
      blob: blob('b1'),
      name: 'before.png',
    },
  ]);
});

it('a text read has no images', () => {
  expect(toolCallImages(read('a', '/repo/src/app.tsx'))).toEqual([]);
});

it('drops image blocks and keeps the rest', () => {
  const row = read('a', '/repo/docs/before.png', 'b1');

  expect(withoutImages(row.content)).toEqual([]);
  expect(withoutImages(read('b', '/repo/app.ts').content)).toHaveLength(1);
});

it('collects a group’s images in the order its calls ran, inside explorations too', () => {
  const group: FeedGroup = {
    type: 'group',
    id: 'g',
    title: 'Read 3 files',
    state: 'settled',
    items: [
      { type: 'tool_call', row: read('a', '/x/one.png', 'b1') },
      {
        type: 'exploration',
        id: 'e',
        state: 'settled',
        toolCalls: [read('b', '/x/app.ts'), read('c', '/x/two.png', 'b2')],
      },
    ],
  };

  expect(groupImages(group).map((image) => image.blob.blobId)).toEqual([
    'b1',
    'b2',
  ]);
});
