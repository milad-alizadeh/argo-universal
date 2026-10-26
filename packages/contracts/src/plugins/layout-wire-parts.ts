import { z } from 'zod';
import { cardDefaults, spacingSteps } from '../kit-tokens';
import { openChange, openStateProps } from './overlay-kit-props';
import { onPress } from './plugin-part-props';
import { actionSlot, part } from './plugin-part-schema-utils';
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

const cardOpenProps = {
  open: openStateProps.shape.open.describe(
    'Controlled open state of a collapsible card.',
  ),
  defaultOpen: openStateProps.shape.defaultOpen.describe(
    'Initial uncontrolled open state of a collapsible card.',
  ),
  onOpenChange: openStateProps.shape.onOpenChange,
};

const cardProps = z.object({
  title: z.string().describe('The card title on its header line.'),
  subtitle: z.string().optional().describe('A second line below the title.'),
  accessibilityLabel: z
    .string()
    .optional()
    .describe("The card's spoken name; defaults to title and subtitle."),
  onPress: onPress.optional().describe('Action run when the card is pressed.'),
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
  collapsible: z
    .boolean()
    .optional()
    .describe(
      'The title, with a disclosure chevron after it, toggles the body; the icon, subtitle and onPress are not used.',
    ),
  ...cardOpenProps,
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
  Spacer: part(
    'Flexible space along its parent Stack direction.',
    spacerProps,
    {
      group: 'layout',
    },
  ),
  Grid: part('Static equal-column grid; use List for long grids.', gridProps, {
    group: 'layout',
    accessibility: {
      keyboard:
        'Grid is a static layout; keyboard focus moves through interactive children in platform order.',
      voiceOver:
        'VoiceOver traverses the Grid children in source order; the layout adds no grid navigation semantics.',
      talkBack:
        'TalkBack traverses the Grid children in source order; the layout adds no grid navigation semantics.',
    },
    children: true,
  }),
  Surface: part('A named Surface with fill, radius and depth.', surfaceProps, {
    group: 'layout',
    children: true,
    slots: { actions: actionSlot },
    appearance:
      'background is flat content; card is flat card; muted is recessed tray; glass is sidebar material, with a plain fill below iOS 26 and on Android.',
  }),
  Card: part(
    'A card on the card or glass Surface: media, an icon, title and subtitle, one action, a body and an optional footer; collapsible, its title toggles the body.',
    cardProps,
    {
      group: 'layout',
      children: true,
      slots: {
        media: ['Image', 'Video', 'Svg'],
        icon: ['Icon', 'Avatar', 'Image', 'Svg'],
        actions: ['Button', 'IconButton'],
        footer: ['Text', 'Stack', 'Button', 'Pill'],
      },
      events: { onOpenChange: openChange(cardProps) },
      accessibility: {
        keyboard:
          "A Card with onPress is one focus stop that activates with Enter or Space; its action stays a focus stop of its own. A collapsible Card's title is a button that toggles the body with Enter or Space.",
        voiceOver:
          'A pressable Card is a button named by accessibilityLabel, or its title and subtitle; a static Card is a group of the same name that reads its media, title, subtitle, action and body in order.',
        talkBack:
          'A pressable Card is a button named by accessibilityLabel, or its title and subtitle; a static Card is a group of the same name that reads its media, title, subtitle, action and body in order.',
      },
      appearance:
        'Desktop, web and iOS draw the card Surface; Android draws the stock Material 3 filled Card. media runs full bleed across the top; one Button or IconButton sits top right on the title line. A collapsible Card puts its chevron after the title and animates the body open and shut; footer sits under the body inside the same fold.',
    },
  ),
  ScrollView: part(
    'A scroll container owning its scroll fade.',
    scrollViewProps,
    {
      group: 'layout',
      children: true,
    },
  ),
};
