import { z } from 'zod';
import { iconSymbol } from '../kit-symbols/icon-schema';
import { tones } from '../kit-tokens';
import { pillProps } from './status-kit-props';

const metadataValue = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('text'),
    text: z.string(),
    icon: iconSymbol.optional(),
  }),
  z.object({ kind: z.literal('pills'), pills: z.array(pillProps) }),
  z.object({
    kind: z.literal('status'),
    text: z.string(),
    tone: z.enum(tones),
  }),
]);

export const metadataProps = z.object({
  title: z.string().optional().describe('Optional section heading.'),
  rows: z
    .array(
      z.object({
        title: z.string().describe('The field label.'),
        value: metadataValue.describe(
          'A text value, Pills, or a labelled StatusDot.',
        ),
        accessibilityLabel: z
          .string()
          .optional()
          .describe('Override the spoken field name and value.'),
      }),
    )
    .describe('Read-only fields in their reading order.'),
});
