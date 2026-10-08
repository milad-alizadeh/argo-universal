import type { BlobRef } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { draftPrompt } from './draft-prompt';

const screenshot: BlobRef = { blobId: 'blob-1', mime: 'image/png', bytes: 10 };
const photo: BlobRef = { blobId: 'blob-2', mime: 'image/jpeg', bytes: 20 };

describe('draftPrompt', () => {
  it('sends the text as written, then each image in draft order', () => {
    expect(draftPrompt('  Fix this  ', [screenshot, photo])).toEqual([
      { type: 'text', text: '  Fix this  ' },
      { type: 'image', mimeType: 'image/png', blob: screenshot },
      { type: 'image', mimeType: 'image/jpeg', blob: photo },
    ]);
  });

  it('leaves out blank text', () => {
    expect(draftPrompt(' \n', [screenshot])).toEqual([
      { type: 'image', mimeType: 'image/png', blob: screenshot },
    ]);
  });
});
