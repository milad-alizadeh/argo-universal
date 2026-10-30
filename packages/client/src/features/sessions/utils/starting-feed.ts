import {
  type BlobRef,
  type ContentBlock,
  isPromptImage,
  type LiveHeader,
  type UserMessage,
} from '@repo/contracts';
import type { ComposerAttachment, ComposerDraft } from '#features/composer';
import type { FeedViewItem } from '#features/feed';

export interface StartingFeed {
  items: FeedViewItem[];
  liveHeader: LiveHeader;
  imageUrl: (blob: BlobRef) => string;
}

const startingId = 'starting';

const deviceImage = (attachment: ComposerAttachment): ContentBlock => ({
  type: 'image',
  name: attachment.name,
  mimeType: attachment.mimeType,
  blob: {
    blobId: attachment.id,
    mime: attachment.mimeType,
    bytes: attachment.bytes,
  },
});

const deviceFile = (attachment: ComposerAttachment): ContentBlock => ({
  type: 'resource_link',
  name: attachment.name,
  uri: attachment.uri,
  mimeType: attachment.mimeType,
  size: attachment.bytes,
});

// Each attachment as the device holds it: an image draws from its local URI, a file shows its name.
const deviceAttachment = (attachment: ComposerAttachment): ContentBlock =>
  isPromptImage(attachment.mimeType)
    ? deviceImage(attachment)
    : deviceFile(attachment);

const sentContent = (sent: ComposerDraft): ContentBlock[] => [
  ...(sent.text.trim() ? [{ type: 'text' as const, text: sent.text }] : []),
  ...(sent.resources ?? []),
  ...sent.attachments.map(deviceAttachment),
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
  const uris = new Map(sent.attachments.map(({ id, uri }) => [id, uri]));

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
