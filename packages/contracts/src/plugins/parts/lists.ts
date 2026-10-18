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

const listProps = z
  .object({
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
    onSearchTextChange: z
      .string()
      .optional()
      .describe(
        'Throttled string payload. Available only with searchMode="plugin"; otherwise the App filters using its Connection-owned search text.',
      ),
    layout: z.enum(['list', 'grid']).optional(),
    direction: z.enum(['vertical', 'horizontal']).optional(),
    columns: z
      .union([z.number(), z.record(z.string(), z.number()), z.literal('auto')])
      .optional(),
    tileSize: z.enum(['sm', 'md', 'lg']).optional(),
    aspect: z.enum(['square', 'landscape', 'portrait']).optional(),
    isLoading: z.boolean().optional(),
  })
  .refine(
    ({ searchMode, onSearchTextChange }) =>
      onSearchTextChange === undefined || searchMode === 'plugin',
    {
      message: 'onSearchTextChange requires searchMode="plugin".',
      path: ['onSearchTextChange'],
    },
  );

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
    listProps,
    {
      slots: {
        sections: ['ListSection'],
        items: ['ListItem'],
        empty: ['EmptyState'],
      },
      accessibility: {
        keyboard:
          'Keyboard navigation moves through List rows or grid items in platform order. The App owns search text per Connection; plugin mode sends throttled onSearchTextChange events from its search control.',
        voiceOver:
          'VoiceOver identifies the List as a collection, reads each ListItem and its selected state, and reaches the EmptyState in the empty Slot when no items remain.',
        talkBack:
          'TalkBack identifies the List as a collection, reads each ListItem and its selected state, and reaches the EmptyState in the empty Slot when no items remain.',
      },
    },
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
      badge: z
        .object({
          count: z.number().int().nonnegative(),
          label: z.string().optional(),
        })
        .optional()
        .describe('A count badge with an optional spoken label.'),
    }),
    {
      slots: {
        media: ['Image', 'Video'],
        leading: containerParts,
        title: ['Text'],
        trailing: rows.filter((name) => name !== 'ListItem'),
        subtitle: ['Text'],
        meta: ['Label', 'Pill', 'StatusDot'],
        progress: ['ProgressBar'],
        actions: ['ActionList'],
      },
      label:
        'The title Slot supplies the accessible name; interactive accessories retain their own names.',
    },
  ),
  Metadata: part('Label and value rows for a detail view.', z.object({}), {
    slots: { rows: ['Label', 'Link', 'Pill', 'StatusDot'] },
  }),
};
