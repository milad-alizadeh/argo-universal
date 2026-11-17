import { createHash } from 'node:crypto';
import type {
  ContentBlock as AcpContentBlock,
  ToolCallContent as AcpToolCallContent,
} from '@agentclientprotocol/sdk';
import type { OutputBlob } from './tool-output';

type AcpImage = Extract<AcpContentBlock, { type: 'image' }>;

// One decode per block: the row's image and the Blob written for it share the same bytes.
const decoded = new WeakMap<AcpImage, OutputBlob>();

const decodeImage = (block: AcpImage): OutputBlob => {
  const data = Buffer.from(block.data, 'base64');
  const blobId = createHash('sha256').update(data).digest('hex');

  return { blob: { blobId, mime: block.mimeType, bytes: data.length }, data };
};

const hasImageBytes = (block: AcpImage): boolean =>
  block.mimeType.startsWith('image/') && block.data.length > 0;

const decodeOnce = (block: AcpImage): OutputBlob => {
  const stored = decoded.get(block) ?? decodeImage(block);
  decoded.set(block, stored);

  return stored;
};

// The Blob a tool's image is stored as, or none when it carries no image bytes.
export const toolImageBlob = (block: AcpImage): OutputBlob | undefined =>
  hasImageBytes(block) ? decodeOnce(block) : undefined;

const contentImage = (block: AcpToolCallContent): AcpImage | undefined =>
  block.type === 'content' && block.content.type === 'image'
    ? block.content
    : undefined;

const storedImage = (block: AcpToolCallContent): OutputBlob[] => {
  const image = contentImage(block);
  const stored = image && toolImageBlob(image);

  return stored ? [stored] : [];
};

// The Blobs of the images in an update's tool content.
export const toolImageBlobs = (
  content: readonly AcpToolCallContent[] | null | undefined,
): OutputBlob[] => (content ?? []).flatMap(storedImage);
