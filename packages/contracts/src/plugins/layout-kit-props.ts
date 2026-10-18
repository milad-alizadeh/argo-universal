import { z } from 'zod';
import { stackGaps } from '../kit-tokens';
import { onPress } from './plugin-part-props';
import { perSizeClass } from './schema-size-class';

export const spacerProps = z.object({});

export const gridProps = z.object({
  columns: perSizeClass(z.number().int().positive()).describe(
    'Equal columns, optionally per Size class. Phones draw at most two.',
  ),
  gap: z.enum(stackGaps).optional().describe('Spacing token between cells.'),
});

export const surfaceProps = z.object({
  kind: z
    .enum(['background', 'card', 'muted', 'glass'])
    .describe('Named Surface with its fill, radius and depth.'),
  padding: z
    .enum(stackGaps)
    .optional()
    .describe('Spacing token inside the Surface.'),
  onPress: onPress.optional().describe('Action run on activation.'),
});

export const scrollViewProps = z.object({
  accessibilityLabel: z
    .string()
    .optional()
    .describe('Spoken name of the scroll region.'),
  direction: z
    .enum(['vertical', 'horizontal'])
    .optional()
    .describe('Scroll direction.'),
});
