import { z } from 'zod';
import { BlobRef } from './feed/content-block';

const maxPreviewUrlLength = 4096;

export const LinkPreviewInput = z.object({
  href: z.string().max(maxPreviewUrlLength),
});

const gitFields = {
  title: z.string(),
  repository: z.string(),
  author: z.string(),
  avatar: BlobRef.optional(),
  createdAt: z.string(),
};

export const LinkPreviewData = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('web'),
    title: z.string(),
    description: z.string().optional(),
    domain: z.string(),
    image: BlobRef.optional(),
    icon: BlobRef.optional(),
  }),
  z.object({
    kind: z.enum(['issue', 'pullRequest']),
    ...gitFields,
    number: z.number().int().positive(),
    state: z.enum(['open', 'closed', 'merged', 'draft']),
    additions: z.number().optional(),
    deletions: z.number().optional(),
  }),
  z.object({ kind: z.literal('commit'), ...gitFields, sha: z.string() }),
]);

export type LinkPreviewData = z.infer<typeof LinkPreviewData>;
