import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { recordedUserMessage, redSquareDataUrl } from './feed-message.mocks';

describe('Feed message mocks', () => {
  it('serves the bytes the recorded image block names', () => {
    const bytes = Buffer.from(redSquareDataUrl.split(',')[1] ?? '', 'base64');
    const image = recordedUserMessage('agent-1', 'image-prompt').content.find(
      (block) => block.type === 'image',
    );
    expect(image?.blob.blobId).toBe(
      createHash('sha256').update(bytes).digest('hex'),
    );
  });
});
