import { z } from 'zod';
import { listDefaults } from '../kit-tokens';
import { handler } from './kit-component-props';
import { pressHandler } from './kit-event-props';
import { progressBarProps, rowBadgeProps } from './status-kit-props';

export const contentListProps = z.object({
  accessibilityLabel: z
    .string()
    .optional()
    .describe('The spoken name of the list.'),
  pagination: z
    .object({
      hasMore: z.boolean().describe('Whether another page is available.'),
      onLoadMore: handler('onLoadMore'),
    })
    .optional()
    .describe('Loads automatically near the end, or the top with anchor=end.'),
  onRefresh: handler('onRefresh')
    .optional()
    .describe(
      'Stock pull to refresh on phones; waits for the handler to settle.',
    ),
  selection: z
    .object({
      mode: z.literal('multiple'),
      selected: z.array(z.string()).readonly(),
      onChange: handler('onChange').optional(),
    })
    .optional()
    .describe(
      'Content selection; desktop modifiers, iOS edit mode, Android long press.',
    ),
  anchor: z
    .literal('end')
    .optional()
    .describe(
      'Starts at the newest row and follows it until the reader scrolls away.',
    ),
  searchMode: z
    .enum(['app', 'plugin'])
    .optional()
    .describe(
      'App filters loaded rows; plugin receives throttled search text.',
    ),
  onSearchTextChange: handler('onSearchTextChange').optional(),
  layout: z
    .enum(['list', 'grid', 'lanes'])
    .optional()
    .describe(
      'Rows, media tiles, or lanes: each Section a column, side by side, on a wide desktop or web window; phones draw lanes as ordinary sections.',
    ),
  onMove: handler('onMove')
    .optional()
    .describe(
      'Turns moving on in a column or lanes; a grid or horizontal shelf does not move. A row with an id moves within and between Sections by drag, long press and drag on phones, or its Move Actions. Reports where it lands; the List redraws when the rows change.',
    ),
  direction: z
    .enum(['vertical', 'horizontal'])
    .optional()
    .describe('Vertical content or a horizontal shelf.'),
  columns: z
    .union([z.number().int().positive(), z.literal('auto')])
    .optional()
    .describe(
      'Column count, capped at 2/4/6 by Size class; auto fits tileSize.',
    ),
  tileSize: z
    .enum(['sm', 'md', 'lg'])
    .optional()
    .meta({ default: listDefaults.tileSize })
    .describe(
      'Minimum tile width; phones cap grids at two columns, lg at one.',
    ),
  aspect: z
    .enum(['square', 'landscape', 'portrait'])
    .optional()
    .meta({ default: listDefaults.aspect })
    .describe('Media aspect: square 1:1, landscape 16:10, portrait 3:4.'),
  appearance: z
    .enum(['plain', 'cards', 'grouped'])
    .optional()
    .meta({ default: listDefaults.appearance })
    .describe(
      'The list appearance: plain rows, cards, or grouped, one card per section in the look of a FieldGroup section (a look only, for long lists).',
    ),
  density: z
    .enum(['regular', 'compact'])
    .optional()
    .meta({ default: listDefaults.density })
    .describe(
      'compact draws each row as one line on a wide desktop or web window; phones always draw regular rows.',
    ),
  footer: z.string().optional().describe('Page-level supporting text.'),
  isLoading: z.boolean().optional().describe('Whether the list is loading.'),
});

// A row press never holds the row disabled while the Plugin answers.
export const rowPress = z.undefined().meta({ blocks: false });

export const listSectionProps = z.object({
  id: z.string().optional().describe('The Section identity a move reports.'),
  selectionMode: z
    .enum(['single', 'multiple'])
    .optional()
    .describe('The section choice mode.'),
  selection: z
    .array(z.string())
    .readonly()
    .optional()
    .describe('Selected row ids.'),
  onSelectionChange: handler('onSelectionChange').optional(),
  title: z.string().optional().describe('The row or section title.'),
  subtitle: z.string().optional().describe('A second line below the title.'),
  footer: z.string().optional().describe('Supporting text below the section.'),
});

export const listItemProps = z.object({
  id: z
    .string()
    .optional()
    .describe('The row identity within its List or choice section.'),
  description: z
    .string()
    .optional()
    .describe('Footer on iOS and desktop; supporting text on Android.'),
  title: z.string().describe('The row or section title.'),
  subtitle: z.string().optional().describe('A second line below the title.'),
  value: z.string().optional().describe('Optional secondary row value.'),
  badge: z
    .union([z.number().int().nonnegative(), rowBadgeProps])
    .optional()
    .describe('A count or status badge over the leading lane.'),
  progress: progressBarProps
    .optional()
    .describe('Progress along the bottom of the row.'),
  selected: z.boolean().optional().describe('Whether the item is selected.'),
  finished: z
    .boolean()
    .optional()
    .describe(
      'A finished item, such as a closed Issue or an archived Session: its title reads muted.',
    ),
  disabled: z
    .boolean()
    .optional()
    .describe('Whether row activation is disabled.'),
  accessibilityLabel: z
    .string()
    .optional()
    .describe('Optional spoken label; defaults to title and value.'),
  onPress: pressHandler.optional().describe('The action run on activation.'),
});
