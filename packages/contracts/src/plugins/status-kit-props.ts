import { z } from 'zod';
import { iconSymbol } from '../kit-symbols/icon-schema';
import { tones } from '../kit-tokens';

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
  text: z.string().describe('The text displayed by the part.'),
  tone: semanticTone,
  accessibilityLabel: z
    .string()
    .optional()
    .describe('Optional spoken description.'),
});

export const pillProps = z.object({
  text: z.string().describe('The text displayed by the part.'),
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
