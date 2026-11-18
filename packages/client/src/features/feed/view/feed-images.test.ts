import type { SessionMessage } from '@repo/contracts';
import { expect, it } from 'vitest';
import {
  recordedAgentMessage,
  recordedUserMessage,
} from '../../../lib/product/feed-message.mocks';
import { feedImages, type ImageStep, imageBeside } from './feed-images';
import type { FeedViewItem } from './feed-view';
import { image, read } from './image-read.mocks';

const text = { type: 'text' as const, text: 'Compare these' };

const prompt = recordedUserMessage('agent-1', 'image-prompt');

const answer = recordedAgentMessage('agent-1', 'markdown-answer');

const reply: SessionMessage = {
  ...prompt,
  id: 'reply',
  sessionUpdate: 'session_message',
  content: [image('b7')],
  _meta: {
    argo: { senderSessionId: 'child', recipientSessionId: 'parent' },
  },
};

const items: FeedViewItem[] = [
  {
    type: 'row',
    row: { ...prompt, id: 'prompt', content: [text, image('b1')] },
  },
  {
    type: 'row',
    row: { ...answer, id: 'answer', content: [image('b2'), text, image('b3')] },
  },
  {
    type: 'group',
    id: 'group',
    title: 'Read 3 files',
    state: 'settled',
    items: [
      { type: 'tool_call', row: read('one', '/x/one.png', 'b4') },
      {
        type: 'exploration',
        id: 'inner',
        state: 'settled',
        toolCalls: [read('app', '/x/app.ts'), read('two', '/x/two.png', 'b5')],
      },
    ],
  },
  { type: 'tool_call', row: read('alone', '/x/alone.png', 'b6') },
  { type: 'child_reply', row: reply },
  {
    type: 'parent_result',
    id: 'result',
    position: 9,
    revision: 1,
    content: [text, image('b8')],
  },
];

it('lists every image the Feed holds once, in Feed order, keyed by its row and place', () => {
  expect(
    feedImages(items).map(({ key, image }) => [key, image.blob.blobId]),
  ).toEqual([
    ['prompt:1', 'b1'],
    ['answer:0', 'b2'],
    ['answer:2', 'b3'],
    ['one:0', 'b4'],
    ['two:0', 'b5'],
    ['alone:0', 'b6'],
    ['reply:0', 'b7'],
    ['result:1', 'b8'],
  ]);
});

it('names a read image after its file', () => {
  expect(feedImages(items).map(({ image }) => image.name)).toEqual([
    undefined,
    undefined,
    undefined,
    'one.png',
    'two.png',
    'alone.png',
    undefined,
    undefined,
  ]);
});

const keyBeside = (key: string, by: ImageStep): string =>
  imageBeside(items, { key, image: image('open') }, by).key;

it('steps on to the image after, across rows', () => {
  expect(keyBeside('answer:0', 1)).toBe('answer:2');
  expect(keyBeside('answer:2', 1)).toBe('one:0');
});

it('steps back to the image before, across rows', () => {
  expect(keyBeside('one:0', -1)).toBe('answer:2');
  expect(keyBeside('answer:0', -1)).toBe('prompt:1');
});

it('stops at the first image', () => {
  expect(keyBeside('prompt:1', -1)).toBe('prompt:1');
});

it('stops at the last image', () => {
  expect(keyBeside('result:1', 1)).toBe('result:1');
});

it('stays on an image the Feed no longer holds', () => {
  expect(keyBeside('gone:0', 1)).toBe('gone:0');
  expect(keyBeside('gone:0', -1)).toBe('gone:0');
});
