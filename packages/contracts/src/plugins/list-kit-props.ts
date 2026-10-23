import { z } from 'zod';
import { pressHandler } from './kit-event-props';
import { handler } from './plugin-part-props';
import { progressBarProps, rowBadgeProps } from './status-kit-props';

export {
  labelProps,
  progressBarProps,
  pillProps,
  rowBadgeProps,
} from './status-kit-props';

export const contentListProps = z.object({
  layout: z.enum(['list', 'grid']).optional().describe('Rows or media tiles.'),
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
    .describe(
      'Minimum tile width; phones cap grids at two columns, lg at one.',
    ),
  aspect: z
    .enum(['square', 'landscape', 'portrait'])
    .optional()
    .describe('Media aspect: square 1:1, landscape 16:10, portrait 3:4.'),
  appearance: z
    .enum(['plain', 'cards', 'grouped'])
    .optional()
    .describe(
      'The list appearance: plain rows, cards, or grouped, one card per section in the look of a FieldGroup section (a look only, for long lists).',
    ),
  footer: z.string().optional().describe('Page-level supporting text.'),
  isLoading: z.boolean().optional().describe('Whether the list is loading.'),
});

// A row press never holds the row disabled while the Plugin answers.
export const rowPress = z.undefined().meta({ blocks: false });

export const listSectionProps = z.object({
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
    .describe('The row identity within a choice section.'),
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
