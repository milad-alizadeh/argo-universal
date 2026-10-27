import { z } from 'zod';
import { acknowledgedEvent } from '../kit-event-props';
import { listExpansion } from '../list-expansion';
import {
  contentListProps,
  listItemProps,
  listSectionProps,
  rowPress,
} from '../list-kit-props';
import { listMediaParts } from '../list-media-parts';
import { actionSlot, part } from '../part';
import { echoes } from '../plugin-part-props';
import {
  tableCellProps,
  tableProps,
  tableRowProps,
  tableSortProps,
} from '../table-kit-props';

const searchThrottleMs = 250;

export const listsParts = {
  List: part(
    'A content list with rows, adaptive media grids or horizontal shelves.',
    contentListProps,
    {
      group: 'lists',
      children: true,
      slots: {
        empty: ['Text', 'Stack', 'EmptyState'],
        header: ['Text', 'Label'],
        actions: actionSlot,
      },
      events: {
        onLoadMore: acknowledgedEvent('pagination'),
        onRefresh: acknowledgedEvent(),
        onChange: z
          .array(z.string())
          .readonly()
          .meta({ within: 'selection', value: 'selected', blocks: false }),
        onSearchTextChange: z
          .string()
          .meta({ blocks: false, throttleMs: searchThrottleMs }),
      },
      expansion: listExpansion,
    },
  ),
  'List.Section': part(
    'A titled List section with optional subtitle, footer and header Actions.',
    listSectionProps,
    {
      group: 'lists',
      children: true,
      slots: {
        actions: actionSlot,
        leading: ['Text', 'Label'],
        trailing: ['Text', 'Label', 'Pill'],
      },
      events: {
        onSelectionChange: echoes(listSectionProps, 'selection'),
      },
    },
  ),
  ListItem: part(
    'A slotted row or media tile, arranged by its List, with selection, a corner badge and context Actions. Child ListItems nest under it and fold on desktop.',
    listItemProps,
    {
      group: 'lists',
      container: true,
      children: ['ListItem'] as const,
      slots: {
        actions: actionSlot,
        media: listMediaParts,
        leading: ['Icon', 'Avatar', 'Image', 'Text', 'Label', 'Svg'],
        trailing: ['Text', 'Label', 'Pill', 'StatusDot', 'Button'],
        meta: ['Label', 'Pill'],
      },
      events: { onPress: rowPress },
      label:
        'The title and optional value supply the accessible name; accessibilityLabel overrides it.',
    },
  ),
  Table: part(
    'Rows of data in columns on regular widths; a list of rows, or a sideways-scrolling grid, on compact widths.',
    tableProps,
    {
      group: 'lists',
      children: ['Table.Row'],
      events: {
        // The Plugin sorts the rows; the header stays live while it answers.
        onSortChange: tableSortProps.meta({ blocks: false }),
        onSelectionChange: echoes(tableProps, 'selection'),
      },
      label:
        'accessibilityLabel names the table; each column title names its header.',
      accessibility: {
        keyboard:
          'Each sortable header is a focus stop that sorts with Enter or Space. Each pressable or selectable row is one focus stop; Enter or Space runs it and the context-menu key opens its Actions.',
        voiceOver:
          'Regular widths read a table of header buttons and rows, announcing the sort order and selection. Compact widths read a list of rows; each opens its Row detail.',
        talkBack:
          'Regular widths read a table of header buttons and rows, announcing the sort order and selection. Compact widths read a list of rows; each opens its Row detail.',
      },
      appearance:
        'Draws a tint tray with a card body and semantic text colors that adapt to light and dark appearance. Column widths are tokens; no arbitrary color or size.',
      expansion: listExpansion,
    },
  ),
  'Table.Row': part(
    'One Table row: a cell per column and optional row Actions.',
    tableRowProps,
    {
      group: 'lists',
      container: true,
      children: ['Table.Cell'],
      slots: { actions: actionSlot },
      events: { onPress: rowPress },
      label:
        'accessibilityLabel names the row; otherwise the cell texts in column order.',
    },
  ),
  'Table.Cell': part(
    "One cell; text alone, or a Pill, Label, StatusDot or Text drawn in the text's place.",
    tableCellProps,
    {
      group: 'lists',
      children: ['Text', 'Label', 'Pill', 'StatusDot'],
      label: 'The required `text` is the spoken value.',
    },
  ),
};
