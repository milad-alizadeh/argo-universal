import { z } from 'zod';
import {
  part,
  handler,
  optionalLabel,
  containerParts,
  rows,
} from '../plugin-part-schema-utils';
import { wireParts } from '../wire-parts';

const tableProps = z.object({
  columns: z
    .array(
      z.object({
        key: z.string().describe('Column key.'),
        title: z.string().describe('Column heading.'),
        align: z.enum(['start', 'center', 'end']).optional(),
        width: z.string().optional().describe('Width token.'),
        sortable: z.boolean().optional(),
      }),
    )
    .describe('Column definitions.'),
  selectionMode: z.enum(['single', 'multiple']).optional(),
  onSelectionChange: handler('onSelectionChange').optional(),
  onSort: handler('onSort').optional(),
});

export const listsPartSchemas = {
  Table: {
    ...wireParts.Table,
    props: tableProps,
    versions: [tableProps],
    children: false,
    slots: { rows: ['ListItem'] },
    events: { onSelectionChange: z.undefined(), onSort: z.undefined() },
  },
  List: part(
    'A settings and content list with sections, pagination, refresh, selection, and list or grid layout.',
    z.object({
      appearance: z.enum(['plain', 'grouped', 'cards']).optional(),
      pagination: z
        .object({
          hasMore: z.boolean(),
          onLoadMore: handler('onLoadMore').optional(),
        })
        .optional(),
      onRefresh: handler('onRefresh').optional(),
      selectionMode: z.enum(['single', 'multiple']).optional(),
      onSelectionChange: handler('onSelectionChange').optional(),
      onReorder: handler('onReorder').optional(),
      anchor: z.enum(['start', 'end']).optional(),
      searchMode: z.enum(['app', 'plugin']).optional(),
      layout: z.enum(['list', 'grid']).optional(),
      direction: z.enum(['vertical', 'horizontal']).optional(),
      columns: z
        .union([
          z.number(),
          z.record(z.string(), z.number()),
          z.literal('auto'),
        ])
        .optional(),
      tileSize: z.enum(['sm', 'md', 'lg']).optional(),
      aspect: z.enum(['square', 'landscape', 'portrait']).optional(),
      isLoading: z.boolean().optional(),
    }),
    { slots: { sections: ['ListSection'], items: ['ListItem'] } },
  ),
  ListSection: part(
    'A titled List section with an optional footer.',
    z.object({ title: optionalLabel, footer: optionalLabel }),
    { slots: { items: ['ListItem'] } },
  ),
  ListItem: part(
    'A slotted list row or grid tile with up to three text lines.',
    z.object({
      selected: z
        .boolean()
        .optional()
        .describe('Whether this item is selected by its parent List.'),
    }),
    {
      slots: {
        media: ['Image', 'Video'],
        leading: containerParts,
        title: ['Text'],
        trailing: rows,
        subtitle: ['Text'],
        meta: ['Label', 'Pill', 'StatusDot'],
        progress: ['ProgressBar'],
        badge: ['Pill'],
        accessories: ['IconButton', 'Checkbox', 'Switch'],
        actions: ['ActionList'],
        accessory: ['IconButton', 'Checkbox', 'Switch'],
      },
      label:
        'The title Slot supplies the accessible name; interactive accessories retain their own names.',
    },
  ),
  Metadata: part('Label and value rows for a detail view.', z.object({}), {
    slots: { rows: ['Label', 'Link', 'Pill', 'StatusDot'] },
  }),
};
