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
  appearance: z
    .enum(['plain', 'grouped', 'cards'])
    .optional()
    .describe('The list appearance.'),
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
