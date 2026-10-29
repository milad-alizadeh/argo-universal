import { z } from 'zod';
import { iconSymbol } from '../kit-symbols/icon-schema';
import { pillDefaults, tones } from '../kit-tokens';
import { handler } from './kit-component-props';

const semanticTone = z
  .enum(tones)
  .optional()
  .describe('The Argo semantic tone.');

export const progressBarProps = z.object({
  value: z.number().min(0).max(1).describe('Progress from zero to one.'),
  tone: semanticTone,
  active: z
    .boolean()
    .optional()
    .describe('Show a running sweep over the progress.'),
  accessibilityLabel: z
    .string()
    .optional()
    .describe('Optional spoken description.'),
});

export const labelProps = z.object({
  icon: iconSymbol
    .optional()
    .describe(
      'An optional Argo icon name or an SF and Material symbol pair; without one the Label shows only its text.',
    ),
  text: z.string().describe('The text displayed by the kit component.'),
  tone: semanticTone,
  accessibilityLabel: z
    .string()
    .optional()
    .describe('Optional spoken description.'),
});

export const pillProps = z.object({
  text: z.string().describe('The text displayed by the kit component.'),
  variant: z
    .enum(['label', 'control'])
    .optional()
    .meta({ default: pillDefaults.variant })
    .describe(
      'A semantic metadata label or an interactive control with shared pill geometry.',
    ),
  appearance: z
    .enum(['plain', 'glass'])
    .optional()
    .meta({ default: pillDefaults.appearance })
    .describe('A plain control, or explicit floating glass for status pills.'),
  icon: iconSymbol.optional().describe('Leading icon, aligned by the Pill.'),
  count: z.number().optional().describe('A count before the label.'),
  countTone: semanticTone.describe(
    'Semantic count color without changing the pill geometry.',
  ),
  detail: z
    .string()
    .optional()
    .describe('Supporting text beside the label, such as the selected effort.'),
  disclosure: z
    .enum(['up', 'down'])
    .optional()
    .describe('Disclosure direction for a control that opens content.'),
  iconOnly: z
    .boolean()
    .optional()
    .describe(
      'Keep the control label accessible while showing only its leading icon.',
    ),
  fill: z
    .boolean()
    .optional()
    .describe('Let the control fill its available row width.'),
  selected: z
    .boolean()
    .optional()
    .describe('Whether an interactive toggle pill is selected.'),
  disabled: z.boolean().optional().describe('Disable control activation.'),
  accessibilityLabel: z
    .string()
    .optional()
    .describe('Spoken control name; defaults to its text.'),
  onPress: handler('onPress').optional().describe('Control activation.'),
  tone: semanticTone,
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .describe(
      'A tracker label color as #rrggbb: the text takes it, over a lighter fill of it.',
    ),
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
