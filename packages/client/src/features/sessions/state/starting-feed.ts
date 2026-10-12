import type {
  BlobRef,
  ContentBlock,
  ImageContent,
  LiveHeader,
  UserMessage,
} from '@repo/contracts';
import type { ComposerDraft } from '#features/composer';
import type { FeedViewItem } from '#features/feed';

export interface StartingFeed {
  items: FeedViewItem[];
  liveHeader: LiveHeader;
  imageUrl: (blob: BlobRef) => string;
}

const startingId = 'starting';

// Each attached image as the device holds it; it draws from its local URI.
const deviceImages = (sent: ComposerDraft): ImageContent[] =>
  sent.images.map((image) => ({
    type: 'image',
    mimeType: 'image/*',
    blob: { blobId: image.id, mime: 'image/*', bytes: image.bytes },
  }));

const sentContent = (sent: ComposerDraft): ContentBlock[] => [
  ...(sent.text.trim() ? [{ type: 'text' as const, text: sent.text }] : []),
  ...deviceImages(sent),
];

// An App-only row: the stored one replaces it once the Session's Feed loads.
const sentPrompt = (sent: ComposerDraft): UserMessage => ({
  id: startingId,
  sessionId: startingId,
  position: 0,
  revision: 0,
  turnId: null,
  state: 'settled',
  sessionUpdate: 'user_message',
  messageId: startingId,
  content: sentContent(sent),
});

// The Feed of a Session still starting: its first prompt as sent, then Working since it was sent.
export function startingFeed(
  sent: ComposerDraft,
  sentAt: number,
): StartingFeed {
  const uris = new Map(sent.images.map((image) => [image.id, image.uri]));
  return {
    items: [{ type: 'row', row: sentPrompt(sent) }],
    liveHeader: {
      text: 'Working',
      source: { type: 'working' },
      startedAt: sentAt,
    },
    imageUrl: (blob) => uris.get(blob.blobId) ?? '',
  };
}
