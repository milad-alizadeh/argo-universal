import { describe, expect, it } from 'vitest';
import { startingFeed } from './starting-feed';

const screenshot = {
  id: 'image-1',
  name: 'screenshot.png',
  uri: 'blob:local/screenshot',
  bytes: 10,
};

describe('startingFeed', () => {
  it('shows the sent prompt with Working since it was sent', () => {
    const feed = startingFeed(
      { text: 'Fix the flaky login test', images: [] },
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
    const feed = startingFeed({ text: ' ', images: [screenshot] }, 1_000);
    const blob = { blobId: 'image-1', mime: 'image/*', bytes: 10 };
    expect(feed.items).toEqual([
      {
        type: 'row',
        row: expect.objectContaining({
          content: [{ type: 'image', mimeType: 'image/*', blob }],
        }),
      },
    ]);
    expect(feed.imageUrl(blob)).toBe('blob:local/screenshot');
  });
});
