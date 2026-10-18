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

export const groupedItemProps = z.object({
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

export const listProps = z.object({});

export const stackProps = layoutProps.extend({
  direction: z.enum(['row', 'column']).describe('The direction of the layout.'),
});
