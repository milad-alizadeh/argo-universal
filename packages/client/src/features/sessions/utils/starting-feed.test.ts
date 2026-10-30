import { describe, expect, it } from 'vitest';
import { startingFeed } from './starting-feed';

const screenshot = {
  id: 'image-1',
  name: 'screenshot.png',
  uri: 'blob:local/screenshot',
  bytes: 10,
  mimeType: 'image/png',
};

const notes = {
  id: 'file-1',
  name: 'notes.md',
  uri: 'file:///notes.md',
  bytes: 12,
  mimeType: 'text/markdown',
};

describe('startingFeed', () => {
  it('shows a chosen suggestion resource beside the text', () => {
    const resource = {
      type: 'resource_link' as const,
      name: 'ITEM-7',
      uri: 'example://items/7',
    };

    const feed = startingFeed(
      { text: 'See ITEM-7 ', attachments: [], resources: [resource] },
      1_000,
    );

    expect(feed.items).toEqual([
      {
        type: 'row',
        row: expect.objectContaining({
          content: [{ type: 'text', text: 'See ITEM-7 ' }, resource],
        }),
      },
    ]);
  });

  it('shows the sent prompt with Working since it was sent', () => {
    const feed = startingFeed(
      { text: 'Fix the flaky login test', attachments: [] },
      1_000,
    );

    expect(feed.items).toEqual([
      {
        type: 'row',
        row: expect.objectContaining({
          sessionUpdate: 'user_message',
          state: 'settled',
          content: [{ type: 'text', text: 'Fix the flaky login test' }],
        }),
      },
    ]);
    expect(feed.liveHeader).toEqual({
      text: 'Working',
      source: { type: 'working' },
      startedAt: 1_000,
    });
  });

  it('shows the attached images from the device before they upload', () => {
    const feed = startingFeed({ text: ' ', attachments: [screenshot] }, 1_000);
    const blob = { blobId: 'image-1', mime: 'image/png', bytes: 10 };
    expect(feed.items).toEqual([
      {
        type: 'row',
        row: expect.objectContaining({
          content: [
            {
              type: 'image',
              name: 'screenshot.png',
              mimeType: 'image/png',
              blob,
            },
          ],
        }),
      },
    ]);
    expect(feed.imageUrl(blob)).toBe('blob:local/screenshot');
  });

  it('shows each attached file by its name', () => {
    const feed = startingFeed({ text: ' ', attachments: [notes] }, 1_000);
    expect(feed.items).toEqual([
      {
        type: 'row',
        row: expect.objectContaining({
          content: [
            {
              type: 'resource_link',
              name: 'notes.md',
              uri: 'file:///notes.md',
              mimeType: 'text/markdown',
              size: 12,
            },
          ],
        }),
      },
    ]);
  });
});
