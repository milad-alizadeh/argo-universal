import { z } from 'zod';

// A reference to a content-addressed file in `~/.argo/blobs/` (ADR-0005).
export const BlobRef = z.strictObject({
  blobId: z.hash('sha256'),
  mime: z.string().min(1),
  bytes: z.int().nonnegative(),
  width: z.int().positive().optional(),
  height: z.int().positive().optional(),
});
export type BlobRef = z.infer<typeof BlobRef>;

export const AttachmentSource = z.enum(['upload', 'pasted']);
export type AttachmentSource = z.infer<typeof AttachmentSource>;

const AttachmentMeta = z.strictObject({
  argo: z.strictObject({ source: AttachmentSource.optional() }).optional(),
});

export const TextContent = z.strictObject({
  type: z.literal('text'),
  text: z.string(),
});
export type TextContent = z.infer<typeof TextContent>;

export const ImageContent = z.strictObject({
  type: z.literal('image'),
  mimeType: z.string().min(1),
  blob: BlobRef,
  _meta: AttachmentMeta.optional(),
});
export type ImageContent = z.infer<typeof ImageContent>;

export const ResourceLink = z.strictObject({
  type: z.literal('resource_link'),
  name: z.string(),
  uri: z.string().min(1),
  mimeType: z.string().min(1).optional(),
  _meta: AttachmentMeta.optional(),
});
export type ResourceLink = z.infer<typeof ResourceLink>;

export const EmbeddedResource = z.strictObject({
  type: z.literal('resource'),
  resource: z.strictObject({
    uri: z.string().min(1),
    text: z.string().optional(),
    mimeType: z.string().min(1).optional(),
  }),
  _meta: AttachmentMeta.optional(),
});
export type EmbeddedResource = z.infer<typeof EmbeddedResource>;

export const ContentBlock = z.discriminatedUnion('type', [
  TextContent,
  ImageContent,
  ResourceLink,
  EmbeddedResource,
]);
export type ContentBlock = z.infer<typeof ContentBlock>;
