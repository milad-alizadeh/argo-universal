import { z } from 'zod';

export const indexedNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  component: z.string(),
  parentId: z.string().nullable(),
});

export type IndexedNode = z.infer<typeof indexedNodeSchema>;

export const fileSchema = z.object({
  fileName: z.string(),
  pageId: z.string(),
  rootNodeId: z.string(),
  pages: z.array(
    z.object({ type: z.string(), id: z.string(), name: z.string() }),
  ),
  artboards: z.array(z.object({ id: z.string(), name: z.string() })),
});

export const pageIndexSchema = z.object({
  fileId: z.string(),
  pageId: z.string(),
  pageName: z.string(),
  scannedAt: z.string(),
  seconds: z.number(),
  calls: z.number(),
  revision: z.null(),
  nodes: z.array(indexedNodeSchema),
});

export type PageIndex = z.infer<typeof pageIndexSchema>;

export type LocatedNode = IndexedNode & {
  fileId: string;
  pageId: string;
  pageName: string;
};
