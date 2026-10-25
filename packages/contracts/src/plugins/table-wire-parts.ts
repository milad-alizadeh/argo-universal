import { listExpansion } from './list-expansion';
import { rowPress } from './list-kit-props';
import { echoes } from './plugin-part-props';
import { part } from './plugin-part-schema-utils';
import {
  tableCellProps,
  tableProps,
  tableRowProps,
  tableSortProps,
} from './table-kit-props';

export const tableWireParts = {
  Table: {
    ...part(
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
            'Each sortable header is a focus stop that sorts with Enter or Space. Each pressable or selectable row is one focus stop; Enter or Space runs it and the context-menu key opens its ActionList.',
          voiceOver:
            'Regular widths read a table of header buttons and rows, announcing the sort order and selection. Compact widths read a list of rows; each opens its Row detail.',
          talkBack:
            'Regular widths read a table of header buttons and rows, announcing the sort order and selection. Compact widths read a list of rows; each opens its Row detail.',
        },
        appearance:
          'Draws a tint tray with a card body and semantic text colors that adapt to light and dark appearance. Column widths are tokens; no arbitrary color or size.',
      },
    ),
    expansion: listExpansion,
  },
  'Table.Row': part(
    'One Table row: a cell per column and an optional row ActionList.',
    tableRowProps,
    {
      group: 'lists',
      container: true,
      children: ['Table.Cell'],
      slots: { actions: ['ActionList'] },
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
