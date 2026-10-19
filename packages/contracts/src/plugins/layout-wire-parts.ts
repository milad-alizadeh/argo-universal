import { z } from 'zod';
import { spacingSteps } from '../kit-tokens';
import { gridAccessibility } from './part-accessibility-metadata';
import { onPress } from './plugin-part-props';
import { part } from './plugin-part-schema-utils';
import { perSizeClass } from './schema-size-class';

const spacerProps = z.object({});

const gridProps = z.object({
  columns: perSizeClass(z.number().int().positive()).describe(
    'Equal columns, optionally per Size class. Phones draw at most two.',
  ),
  gap: z.enum(spacingSteps).optional().describe('Spacing token between cells.'),
});

const surfaceProps = z.object({
  kind: z
    .enum(['background', 'card', 'muted', 'glass'])
    .describe('Named Surface with its fill, radius and depth.'),
  padding: z
    .enum(spacingSteps)
    .optional()
    .describe('Spacing token inside the Surface.'),
  onPress: onPress.optional().describe('Action run on activation.'),
});

const scrollViewProps = z.object({
  accessibilityLabel: z
    .string()
    .optional()
    .describe('Spoken name of the scroll region.'),
  direction: z
    .enum(['vertical', 'horizontal'])
    .optional()
    .describe('Scroll direction.'),
});

export const layoutWireParts = {
  Spacer: part('Flexible space along its parent Stack direction.', spacerProps),
  Grid: part('Static equal-column grid; use List for long grids.', gridProps, {
    accessibility: gridAccessibility,
    children: true,
  }),
  Surface: part('A named Surface with fill, radius and depth.', surfaceProps, {
    children: true,
    slots: { actions: ['ActionList'] },
    appearance:
      'background is flat content; card is flat card; muted is recessed tray; glass is sidebar material, with a plain fill below iOS 26 and on Android.',
  }),
  ScrollView: part(
    'A scroll container owning its scroll fade.',
    scrollViewProps,
    {
      children: true,
    },
  ),
};
