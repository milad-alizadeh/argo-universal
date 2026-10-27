import { z } from 'zod';
import { kitSchemaJson } from '../kit-schema-json';

declare const listItem: unique symbol;

declare const renderedNode: unique symbol;

export type KitListItem = { readonly [listItem]: true };

export type KitNode = { readonly [renderedNode]: true };

const item = z
  .custom<KitListItem>()
  .register(kitSchemaJson, { 'x-argo-type': 'Item' });

const node = z
  .custom<KitNode>()
  .register(kitSchemaJson, { 'x-argo-type': 'Node' });

const renderItem = z
  .function({ input: [item, z.number()], output: node })
  .register(kitSchemaJson, { 'x-argo-type': '(item, index) => node' });

// Expansion happens before serialization. Only its keyed children cross the wire.
export const listExpansion = z.union([
  z.object({
    items: z
      .array(item)
      .readonly()
      .describe('Input items, expanded in the worker; pair with renderItem.'),
    renderItem: renderItem.describe(
      'Renders one keyed child for each item; receives the item and its index.',
    ),
    children: z.never().optional(),
  }),
  z.object({ items: z.never().optional(), renderItem: z.never().optional() }),
]);

export const listComponentNames = ['List', 'Table'] as const;
