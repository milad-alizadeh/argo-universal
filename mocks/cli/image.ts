import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { AgentCommandOf } from '@repo/agents';

type PromptBlock = AgentCommandOf<'agent.prompt'>['content'][number];

const image = readFileSync(new URL('./red-square.png', import.meta.url));

// An image a recording sent inline, as the content-addressed block the Server stores for it.
export function recordedImage(mimeType: string, base64: string): PromptBlock {
  const bytes = Buffer.from(base64, 'base64');
  const isPng = bytes.subarray(1, 4).toString('latin1') === 'PNG';
  return {
    type: 'image',
    mimeType,
    blob: {
      blobId: createHash('sha256').update(bytes).digest('hex'),
      mime: mimeType,
      bytes: bytes.byteLength,
      ...(isPng && {
        width: bytes.readUInt32BE(16),
        height: bytes.readUInt32BE(20),
      }),
    },
  };
}

// A `data:` URL image, as some Agents record one.
export function recordedDataUrlImage(url: string): PromptBlock {
  const match = /^data:([^;]+);base64,(.*)$/.exec(url);
  if (!match?.[1] || match[2] === undefined)
    throw new Error('Expected a base64 data URL image.');
  return recordedImage(match[1], match[2]);
}

export const recordedImagePrompt: AgentCommandOf<'agent.prompt'>['content'] = [
  {
    type: 'text',
    text: 'Name the dominant color in this image in one word. Do not use tools.',
  },
  {
    type: 'image',
    mimeType: 'image/png',
    blob: {
      blobId: createHash('sha256').update(image).digest('hex'),
      mime: 'image/png',
      bytes: image.byteLength,
      width: 32,
      height: 32,
    },
  },
];
