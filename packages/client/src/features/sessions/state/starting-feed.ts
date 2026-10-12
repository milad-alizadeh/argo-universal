import type { BlobRef, ImageContent, LiveHeader } from '@repo/contracts';
import type { ComposerDraft } from '#features/composer';
import type { FeedViewItem } from '#features/feed';

export interface StartingFeed {
  items: FeedViewItem[];
  liveHeader: LiveHeader;
  imageUrl: (blob: BlobRef) => string;
}

const startingId = 'starting';

// The Feed of a Session still starting: its first prompt as sent, then Working, until the Session's own Feed loads.
export function startingFeed(
  sent: ComposerDraft,
  sentAt: number,
): StartingFeed {
  const images = sent.images.map((image): ImageContent => ({
    type: 'image',
    mimeType: 'image/*',
    blob: { blobId: image.id, mime: 'image/*', bytes: image.bytes },
  }));
  const uris = new Map(sent.images.map((image) => [image.id, image.uri]));
  return {
    items: [
      {
        type: 'row',
        row: {
          id: startingId,
          sessionId: startingId,
          position: 0,
          revision: 0,
          turnId: null,
          state: 'settled',
          sessionUpdate: 'user_message',
          messageId: startingId,
          content: [
            ...(sent.text.trim()
              ? [{ type: 'text' as const, text: sent.text }]
              : []),
            ...images,
          ],
        },
      },
    ],
    liveHeader: {
      text: 'Working',
      source: { type: 'working' },
      startedAt: sentAt,
    },
    imageUrl: (blob) => uris.get(blob.blobId) ?? '',
  };
}
