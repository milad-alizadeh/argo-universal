import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';

export const stylesSchema = z.record(
  z.string(),
  z.union([z.string(), z.number()]),
);

export type Styles = z.infer<typeof stylesSchema>;

export const nodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  component: z.string(),
  parentId: z.string().nullable(),
  childIds: z.array(z.string()),
  textContent: z.string().nullable(),
  isVisible: z.boolean(),
  isLocked: z.boolean(),
});

export type PaperNode = z.infer<typeof nodeSchema>;

export const snapshotSchema = z.object({
  fileId: z.string(),
  rootId: z.string(),
  nodes: z.array(
    nodeSchema.extend({
      styles: stylesSchema,
      svg: z.string().nullable(),
      nested: z.boolean().optional(),
    }),
  ),
});

export type DesignNode = z.infer<typeof snapshotSchema>['nodes'][number];

export type Snapshot = z.infer<typeof snapshotSchema>;

export const bindingSchema = z.object({
  fileId: z.string(),
  nodeId: z.string(),
  name: z.string(),
  nodes: z.record(z.string(), z.string()),
  textOverrides: z.record(z.string(), z.string()),
  lastText: z.record(z.string(), z.string()),
  layout: stylesSchema,
  location: z
    .object({
      fileId: z.string(),
      page: z.string(),
      board: z.string(),
      flow: z.string(),
    })
    .optional(),
  structure: z.string().optional(),
});

export type Binding = z.infer<typeof bindingSchema>;

export const registrySchema = z.object({
  version: z.literal(1),
  families: z.array(
    z.object({
      name: z.string(),
      master: z.object({ fileId: z.string(), nodeId: z.string() }),
      copies: z.array(bindingSchema),
    }),
  ),
});

export type Registry = z.infer<typeof registrySchema>;

export const layoutKeys = new Set([
  'position',
  'top',
  'left',
  'right',
  'bottom',
  'width',
  'height',
  'minHeight',
  'maxHeight',
  'minWidth',
  'maxWidth',
  'alignSelf',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'order',
  'zIndex',
]);

export function getRoot(snapshot: Snapshot): DesignNode {
  const root = snapshot.nodes.find((node) => node.id === snapshot.rootId);

  if (!root) throw new Error(`Missing root ${snapshot.rootId}`);

  return root;
}

export function equalValues(left: Snapshot, right: Snapshot): boolean {
  return isDeepStrictEqual(left, right);
}

export function required<T>(value: T | undefined | null): T {
  if (value === undefined || value === null)
    throw new Error('Missing required Paper value');

  return value;
}
