import { z } from 'zod';
import {
  buttonSizes,
  buttonVariants,
  stackAlignments,
  isStackGap,
  type StackGap,
  textRoles,
  tones,
} from '../kit-tokens';
import { materialSymbolNames } from './material-symbol-names.gen';
import { sfSymbolNames } from './sf-symbol-names.gen';
import { Action, WireEvent } from './wire';

const pressHandler = z
  .union([WireEvent.extend({ $event: z.literal('onPress') }), Action])
  .describe('A Plugin event handler or an App action.');

export const textV1 = z.object({
  label: z.string().describe('The text displayed by the part.'),
  variant: z.enum(textRoles).optional().describe('The Argo typography role.'),
  tone: z.enum(tones).optional().describe('The Argo semantic text tone.'),
});

export const textProps = textV1.extend({
  accessibilityLabel: z
    .string()
    .optional()
    .describe('Optional spoken label; defaults to label.'),
});

export const buttonProps = z.object({
  label: z.string().describe('The button label.'),
  variant: z.enum(buttonVariants).optional().describe('The button treatment.'),
  tone: z.literal('danger').optional().describe('Semantic danger treatment.'),
  size: z.enum(buttonSizes).optional().describe('The button size.'),
  disabled: z.boolean().optional().describe('Whether activation is disabled.'),
  onPress: pressHandler.optional().describe('The action run on activation.'),
});

export const layoutProps = z.object({
  gap: z
    .custom<StackGap>((value) => typeof value === 'number' && isStackGap(value))
    .meta({
      type: 'number',
      description: 'A spacing token: 0, 1, 2, 3, 4, 5, 6, 8, 10, or 12.',
    })
    .optional(),
  align: z.enum(stackAlignments).optional().describe('Cross-axis alignment.'),
});

export const groupedItemV1 = z.object({
  label: z.string().describe('The row label and accessible name.'),
  value: z.string().optional().describe('Optional secondary row value.'),
  disabled: z
    .boolean()
    .optional()
    .describe('Whether row activation is disabled.'),
  onPress: pressHandler.optional().describe('The action run on activation.'),
});

const svgXmlCharacterLimit = 131_072;

export const svgProps = z.object({
  xml: z.string().max(svgXmlCharacterLimit),
  label: z.string().min(1),
  tone: z.enum(tones).optional(),
  aspectRatio: z.number().finite().positive().optional(),
  onPress: pressHandler.optional(),
});

export const groupedItemProps = groupedItemV1;

export const listProps = z.object({});

export const contentListProps = z.object({
  appearance: z.enum(['plain', 'grouped', 'cards']).optional(),
  isLoading: z.boolean().optional(),
});

export const listSectionProps = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  footer: z.string().optional(),
});

export const progressBarProps = z.object({
  value: z.number().min(0).max(1),
  tone: z.enum(tones).optional(),
  active: z.boolean().optional(),
  accessibilityLabel: z.string().optional(),
});

export const labelProps = z.object({
  icon: z.object({
    sf: z.enum(sfSymbolNames),
    material: z.enum(materialSymbolNames),
  }),
  text: z.string(),
  tone: z.enum(tones).optional(),
  accessibilityLabel: z.string().optional(),
});

export const pillProps = z.object({
  text: z.string(),
  tone: z.enum(tones).optional(),
  color: z.string().optional(),
});

export const rowBadgeProps = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('status'),
    tone: z.enum(tones),
    pulse: z.boolean().optional(),
    label: z.string().optional(),
  }),
  z.object({
    kind: z.literal('count'),
    count: z.number().int().nonnegative(),
    label: z.string().optional(),
  }),
]);

export const listItemProps = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  value: z.string().optional(),
  badge: z.union([z.number().int().nonnegative(), rowBadgeProps]).optional(),
  progress: progressBarProps.optional(),
  selected: z.boolean().optional(),
  disabled: z.boolean().optional(),
  accessibilityLabel: z.string().optional(),
  onPress: pressHandler.optional(),
});

export const stackProps = layoutProps.extend({
  direction: z.enum(['row', 'column']).describe('The direction of the layout.'),
});
