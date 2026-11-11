import { z } from 'zod';
import { iconSymbol } from '../kit-symbols/icon-schema';
import { tones } from '../kit-tokens';

const field = z.object({
  title: z.string().describe('The field label.'),
  accessibilityLabel: z
    .string()
    .optional()
    .describe('Override the spoken field name and value.'),
});

export const metadataProps = z.object({
  title: z
    .string()
    .optional()
    .describe('Optional heading, inside a List as its section heading.'),
});

const fieldIcon = iconSymbol
  .optional()
  .describe(
    'The glyph before the value; without one, a narrow window keeps the value in words.',
  );

export const metadataLabelProps = field.extend({
  text: z.string().describe('The field value.'),
  icon: fieldIcon,
});

export const metadataLinkProps = field.extend({
  text: z.string().describe('The displayed link text.'),
  href: z
    .string()
    .describe(
      'An http, https or mailto URL, or an absolute route within the App.',
    ),
  icon: fieldIcon,
});

export const metadataPillsProps = field.extend({ icon: fieldIcon });

export const metadataStatusDotProps = field.extend({
  text: z.string().describe('The status text.'),
  tone: z.enum(tones),
});

export const metadataAvatarProps = field.extend({
  name: z.string().describe('The person’s displayed name.'),
  src: z.string().optional().describe('Optional avatar image URI.'),
});

export const metadataChildComponents = [
  'Metadata.Label',
  'Metadata.Link',
  'Metadata.Pills',
  'Metadata.StatusDot',
  'Metadata.Avatar',
] as const;
