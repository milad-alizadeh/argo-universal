import { z } from 'zod';
import { blobColumns } from '../columns';
import { createFeedMetadataSchema } from './metadata';

// A reference to a content-addressed file in `~/.argo/blobs/` (ADR-0005), from the `blob` table.
export const BlobRef = z.strictObject({
  blobId: blobColumns.shape.id,
  mime: blobColumns.shape.mime,
  bytes: blobColumns.shape.bytes,
  width: blobColumns.shape.width.unwrap().optional(),
  height: blobColumns.shape.height.unwrap().optional(),
});

export type BlobRef = z.infer<typeof BlobRef>;

// Where the Server serves a stored blob over HTTP, beside tRPC.
export const blobPath = (blobId: string): string => `/blobs/${blobId}`;

const AttachmentSource = z.enum(['upload', 'pasted']);

const AttachmentMeta = createFeedMetadataSchema(
  z.strictObject({ source: AttachmentSource.optional() }),
);

const noExtensionMeta = createFeedMetadataSchema(z.strictObject({}));

export const TextContent = z.strictObject({
  type: z.literal('text'),
  text: z.string(),
  _meta: noExtensionMeta,
});

export type TextContent = z.infer<typeof TextContent>;

export const ImageContent = z.strictObject({
  type: z.literal('image'),
  // The filename it was attached under, shown in the Feed as an uploaded file's `name` is.
  name: z.string().optional(),
  mimeType: z.string(),
  blob: BlobRef,
  _meta: AttachmentMeta,
});

export type ImageContent = z.infer<typeof ImageContent>;

export const ResourceLink = z.strictObject({
  type: z.literal('resource_link'),
  name: z.string(),
  uri: z.string(),
  mimeType: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  size: z.number().optional(),
  // An uploaded file: its `uri` is the blob's path, and the Engine hands the Agent the file itself.
  blob: BlobRef.optional(),
  _meta: AttachmentMeta,
});

export type ResourceLink = z.infer<typeof ResourceLink>;

// A file uploaded from the device; a first prompt links only these, never paths on the Server.
export const UploadedFileLink = ResourceLink.extend({ blob: BlobRef });

export type UploadedFileLink = z.infer<typeof UploadedFileLink>;

export const EmbeddedResource = z.strictObject({
  type: z.literal('resource'),
  resource: z.strictObject({
    uri: z.string(),
    text: z.string().optional(),
    mimeType: z.string().optional(),
    _meta: noExtensionMeta,
  }),
  _meta: AttachmentMeta,
});

export type EmbeddedResource = z.infer<typeof EmbeddedResource>;

export const UnsupportedContent = z.strictObject({
  type: z.literal('unsupported'),
  contentKind: z.string(),
  reason: z.string(),
  reference: z.string().optional(),
  _meta: noExtensionMeta,
});

export type UnsupportedContent = z.infer<typeof UnsupportedContent>;

export const ContentBlock = z.discriminatedUnion('type', [
  TextContent,
  ImageContent,
  ResourceLink,
  EmbeddedResource,
  UnsupportedContent,
]);

export type ContentBlock = z.infer<typeof ContentBlock>;

export const isUploadedFile = (
  block: ContentBlock,
): block is UploadedFileLink =>
  block.type === 'resource_link' && block.blob !== undefined;

// Larger text files are linked, so one attachment cannot fill the Agent's context.
export const inlineTextLimitBytes = 102_400;

// Text an Agent can read inline, and the attachment card can preview: UTF-8 that decoded cleanly, with no NUL.
export const isPlainText = (decoded: string): boolean =>
  !decoded.includes('\0') && !decoded.includes('\uFFFD');
