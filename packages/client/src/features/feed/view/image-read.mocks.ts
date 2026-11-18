import type { BlobRef, ImageContent, ToolCallUpdate } from '@repo/contracts';

export const blob = (blobId: string): BlobRef => ({
  blobId,
  mime: 'image/png',
  bytes: 4,
});

export const image = (blobId: string): ImageContent => ({
  type: 'image',
  mimeType: 'image/png',
  blob: blob(blobId),
});

const settledRead = {
  sessionId: 's',
  position: 0,
  revision: 1,
  turnId: null,
  sessionUpdate: 'tool_call_update',
  state: 'settled',
  kind: 'read',
  status: 'completed',
} satisfies Partial<ToolCallUpdate>;

const readOutput = (blobId?: string): ToolCallUpdate['content'] =>
  blobId
    ? [{ type: 'content', content: image(blobId) }]
    : [{ type: 'content', content: { type: 'text', text: 'export {}' } }];

// A settled read of `path`, which returned the image `blobId` names, or text without one.
export const read = (
  id: string,
  path: string,
  blobId?: string,
): ToolCallUpdate => ({
  ...settledRead,
  id,
  toolCallId: id,
  title: `Read ${path}`,
  locations: [{ path }],
  rawInput: { file_path: path },
  content: readOutput(blobId),
});
