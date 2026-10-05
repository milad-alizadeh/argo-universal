import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { AgentCommandOf } from '@repo/agents';

const image = readFileSync(new URL('./red-square.png', import.meta.url));

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
