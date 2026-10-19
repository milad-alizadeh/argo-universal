import { z } from 'zod';
import { iconSymbol } from '../kit-symbols/icon-schema';
import { tones } from '../kit-tokens';
import { materialSymbolNames } from './material-symbol-names.gen';
import { sfSymbolNames } from './sf-symbol-names.gen';

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

export const labelV1 = z.object({
  icon: z
    .object({
      sf: z.enum(sfSymbolNames),
      material: z.enum(materialSymbolNames),
    })
    .describe('The SF and Material symbol pair.'),
  text: z.string().describe('The text displayed by the part.'),
  tone: semanticTone,
  accessibilityLabel: z
    .string()
    .optional()
    .describe('Optional spoken description.'),
});

export const labelV2 = labelV1.extend({
  icon: iconSymbol.describe(
    'An Argo icon name or an SF and Material symbol pair.',
  ),
});

export const labelProps = labelV2.extend({
  icon: iconSymbol
    .optional()
    .describe(
      'An optional Argo icon name or an SF and Material symbol pair; without one the Label shows only its text.',
    ),
});

export const pillProps = z.object({
  text: z.string().describe('The text displayed by the part.'),
  tone: semanticTone,
  color: z.string().optional().describe('A tracker label color.'),
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
