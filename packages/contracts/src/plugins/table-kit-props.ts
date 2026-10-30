import { z } from 'zod';
import { handler } from './kit-component-props';
import { pressHandler } from './kit-event-props';

const tableColumnProps = z.object({
  id: z.string().min(1).describe('The column identity cells name.'),
  title: z.string().describe('The column header title.'),
  align: z
    .enum(['start', 'end'])
    .optional()
    .describe('Cell alignment; end suits numbers and times.'),
  width: z
    .enum(['sm', 'md', 'lg'])
    .optional()
    .describe('A fixed width token; the first column fills the rest.'),
  sortable: z
    .boolean()
    .optional()
    .describe('Whether the column header sorts the rows.'),
  compact: z
    .enum(['title', 'subtitle', 'value', 'hidden'])
    .optional()
    .describe(
      'The ListItem line this column fills at compact widths; first is title, second subtitle, last value, the rest hidden.',
    ),
});

export const tableSortProps = z.object({
  column: z.string().describe('The sorted column id.'),
  direction: z.enum(['ascending', 'descending']).describe('The sort order.'),
});

export const tableProps = z.object({
  columns: z
    .array(tableColumnProps)
    .min(1)
    .readonly()
    .describe('The columns in order; the first one names each row.'),
  compactLayout: z
    .enum(['list', 'scroll'])
    .optional()
    .describe(
      'Compact widths draw a list of rows, or keep the grid and scroll sideways.',
    ),
  sort: tableSortProps
    .optional()
    .describe('The sorted column; the Plugin sorts the rows.'),
  onSortChange: handler('onSortChange').optional(),
  selectionMode: z
    .enum(['single', 'multiple'])
    .optional()
    .describe('The row choice mode.'),
  selection: z
    .array(z.string())
    .readonly()
    .optional()
    .describe('Selected row ids.'),
  onSelectionChange: handler('onSelectionChange').optional(),
  accessibilityLabel: z
    .string()
    .optional()
    .describe('Spoken name of the table.'),
});

export const tableRowProps = z.object({
  id: z.string().min(1).describe('The row identity for selection.'),
  accessibilityLabel: z
    .string()
    .optional()
    .describe('Optional spoken label; defaults to the cell texts.'),
  onPress: pressHandler
    .optional()
    .describe('The primary action, run on activation at regular widths.'),
});

export const tableCellProps = z.object({
  column: z.string().describe('The id of the column this cell fills.'),
  text: z
    .string()
    .describe('The cell text; also the spoken and compact value.'),
});
