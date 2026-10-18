import { z } from 'zod';
import { pressHandler } from './kit-event-props';
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
  isLoading: z.boolean().optional().describe('Whether the list is loading.'),
});

export const listSectionProps = z.object({
  title: z.string().optional().describe('The row or section title.'),
  subtitle: z.string().optional().describe('A second line below the title.'),
  footer: z.string().optional().describe('Supporting text below the section.'),
});

export const listItemProps = z.object({
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
