import { z } from 'zod';
import { iconSymbol } from '../kit-symbols/icon-schema';
import {
  buttonDefaults,
  buttonSizes,
  buttonVariants,
  stackAlignments,
  spacingSteps,
  textDefaults,
  textRoles,
  tones,
} from '../kit-tokens';
import { pressHandler } from './kit-event-props';
import { perSizeClass } from './schema-size-class';
import { svgCharacterLimit } from './wire-limits';

export const textProps = z.object({
  children: z
    .union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))])
    .optional()
    .describe('Text content in source order.'),
  role: perSizeClass(z.enum(textRoles))
    .optional()
    .meta({ default: textDefaults.role })
    .describe('The typography role, optionally by Size class.'),
  tone: z.enum(tones).optional().describe('The Argo semantic text tone.'),
  accessibilityLabel: z
    .string()
    .optional()
    .describe('Optional spoken label; defaults to the text content.'),
});

export const buttonProps = z.object({
  label: z.string().describe('The button label.'),
  variant: z
    .enum(buttonVariants)
    .optional()
    .meta({ default: buttonDefaults.variant })
    .describe('The button treatment: filled, outlined, text, or danger text.'),
  size: z
    .enum(buttonSizes)
    .optional()
    .meta({ default: buttonDefaults.size })
    .describe('The button size.'),
  disabled: z.boolean().optional().describe('Whether activation is disabled.'),
  onPress: pressHandler.optional().describe('The action run on activation.'),
  icon: iconSymbol
    .optional()
    .describe(
      'An icon before the label: one of Argo’s, or an SF Symbol and Material Symbol pair.',
    ),
  fullWidth: z
    .union([z.boolean(), z.literal('narrow')])
    .optional()
    .describe('Fill the row always, or only in a narrow window.'),
  loading: z
    .boolean()
    .optional()
    .describe('Whether the action is running; activation is disabled.'),
  accessibilityLabel: z
    .string()
    .optional()
    .describe('Spoken name when the visible label says too little.'),
});

const layoutProps = z.object({
  gap: z
    .enum(spacingSteps)
    .optional()
    .describe('A spacing token between children.'),
  align: z.enum(stackAlignments).optional().describe('Cross-axis alignment.'),
});

export const svgProps = z.object({
  xml: z
    .string()
    .max(svgCharacterLimit)
    .describe('Sanitized SVG markup to draw.'),
  label: z.string().min(1).describe('The accessible name of the artwork.'),
  tone: z.enum(tones).optional().describe('The semantic artwork color.'),
  aspectRatio: z
    .number()
    .finite()
    .positive()
    .optional()
    .describe('The artwork width divided by its height.'),
  onPress: pressHandler
    .optional()
    .describe('The action run when the artwork is pressed.'),
});

export const stackProps = layoutProps.extend({
  direction: z.enum(['row', 'column']).describe('The direction of the layout.'),
});

export const emptyStateProps = z.object({
  icon: z.string().optional().describe('Optional native symbol name.'),
  title: z.string().describe('The empty state heading.'),
  description: z.string().optional().describe('Optional supporting text.'),
});
