import { type BlobRef, blobPath } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { draftPrompt } from './draft-prompt';

const screenshot: BlobRef = { blobId: 'blob-1', mime: 'image/png', bytes: 10 };

const photo: BlobRef = { blobId: 'blob-2', mime: 'image/jpeg', bytes: 20 };

const brief: BlobRef = { blobId: 'blob-3', mime: 'text/markdown', bytes: 30 };

const vector: BlobRef = { blobId: 'blob-4', mime: 'image/svg+xml', bytes: 40 };

describe('draftPrompt', () => {
  it('sends the text as written, then each image in draft order', () => {
    expect(
      draftPrompt('  Fix this  ', [
        { name: 'screenshot.png', blob: screenshot },
        { name: 'photo.jpg', blob: photo },
      ]),
    ).toEqual([
      { type: 'text', text: '  Fix this  ' },
      { type: 'image', mimeType: 'image/png', blob: screenshot },
      { type: 'image', mimeType: 'image/jpeg', blob: photo },
    ]);
  });

  it('sends each chosen suggestion resource after the text, before the uploads', () => {
    const resource = {
      type: 'resource_link' as const,
      name: 'Item 7',
      uri: 'example://items/7',
    };

    expect(
      draftPrompt(
        'See ITEM-7 ',
        [{ name: 'screenshot.png', blob: screenshot }],
        [resource],
      ),
    ).toEqual([
      { type: 'text', text: 'See ITEM-7 ' },
      resource,
      { type: 'image', mimeType: 'image/png', blob: screenshot },
    ]);
  });

  it('leaves out blank text', () => {
    expect(
      draftPrompt(' \n', [{ name: 'screenshot.png', blob: screenshot }]),
    ).toEqual([{ type: 'image', mimeType: 'image/png', blob: screenshot }]);
  });

  it.each([
    { name: 'brief.md', blob: brief },
    { name: 'logo.svg', blob: vector },
  ])('sends $name as a link to its uploaded file', (upload) => {
    expect(draftPrompt('', [upload])).toEqual([
      {
        type: 'resource_link',
        name: upload.name,
        uri: blobPath(upload.blob.blobId),
        mimeType: upload.blob.mime,
        size: upload.blob.bytes,
        blob: upload.blob,
      },
    ]);
  });
});
