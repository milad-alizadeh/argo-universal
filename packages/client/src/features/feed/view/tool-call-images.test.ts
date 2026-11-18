import { expect, it } from 'vitest';
import type { FeedGroup } from './feed-view';
import { blob, read } from './image-read.mocks';
import { groupImages, toolCallImages, withoutImages } from './tool-call-images';

it('names a read image after its file', () => {
  expect(toolCallImages(read('a', '/repo/docs/before.png', 'b1'))).toEqual([
    {
      key: 'a:0',
      image: {
        type: 'image',
        mimeType: 'image/png',
        blob: blob('b1'),
        name: 'before.png',
      },
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

  expect(groupImages(group).map(({ image }) => image.blob.blobId)).toEqual([
    'b1',
    'b2',
  ]);
});
