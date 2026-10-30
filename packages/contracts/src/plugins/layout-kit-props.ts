import { z } from 'zod';
import { cardDefaults, scrollViewDefaults, spacingSteps } from '../kit-tokens';
import { onPress } from './kit-component-props';
import { openStateProps } from './overlay-kit-props';
import { perSizeClass } from './schema-size-class';

export const spacerProps = z.object({});

export const gridProps = z.object({
  columns: perSizeClass(z.number().int().positive()).describe(
    'Equal columns, optionally per Size class. Phones draw at most two.',
  ),
  gap: z.enum(spacingSteps).optional().describe('Spacing token between cells.'),
});

export const surfaceProps = z.object({
  kind: z
    .enum(['background', 'card', 'muted', 'glass'])
    .describe('Named Surface with its fill, radius and depth.'),
  padding: z
    .enum(spacingSteps)
    .optional()
    .describe('Spacing token inside the Surface.'),
  onPress: onPress.optional().describe('Action run on activation.'),
});

const cardOpenProps = {
  open: openStateProps.shape.open.describe(
    'Controlled open state of a collapsible card.',
  ),
  defaultOpen: openStateProps.shape.defaultOpen.describe(
    'Initial uncontrolled open state of a collapsible card.',
  ),
  onOpenChange: openStateProps.shape.onOpenChange,
};

const cardBase = z.object({
  title: z.string().describe('The card title on its header line.'),
  accessibilityLabel: z
    .string()
    .optional()
    .describe("The card's spoken name; defaults to title and subtitle."),
  kind: z
    .enum(['card', 'glass'])
    .optional()
    .meta({ default: cardDefaults.kind })
    .describe('The Surface the card is drawn on.'),
  density: z
    .enum(['regular', 'compact'])
    .optional()
    .meta({ default: cardDefaults.density })
    .describe(
      'compact draws tighter padding and a smaller gap under the title, for cards stacked in a narrow column.',
    ),
});

const staticCard = cardBase.extend({
  subtitle: z.string().optional().describe('A second line below the title.'),
  onPress: onPress.optional().describe('Action run when the card is pressed.'),
  collapsible: z.literal(false).optional(),
  open: z.never().optional(),
  defaultOpen: z.never().optional(),
  onOpenChange: z.never().optional(),
});

// The title, not the card, is what presses: it has no subtitle line and no action of its own.
export const collapsibleCard = cardBase.extend({
  collapsible: z
    .literal(true)
    .describe(
      'The title, with a disclosure chevron after it, toggles the body.',
    ),
  subtitle: z.never().optional(),
  onPress: z.never().optional(),
  ...cardOpenProps,
});

export const cardProps = z.union([staticCard, collapsibleCard]);

export const scrollViewProps = z.object({
  accessibilityLabel: z
    .string()
    .optional()
    .describe('Spoken name of the scroll region.'),
  direction: z
    .enum(['vertical', 'horizontal'])
    .optional()
    .meta({ default: scrollViewDefaults.direction })
    .describe('Scroll direction.'),
});
