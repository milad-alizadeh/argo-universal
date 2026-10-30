import { z } from 'zod';
import { iconSymbol, iconSize } from '../kit-symbols/icon-schema';
import {
  avatarDefaults,
  iconButtonDefaults,
  iconButtonSizes,
  tones,
} from '../kit-tokens';
import { handler } from './kit-component-props';
import { imageAsset } from './media-kit-props';
import { perSizeClass } from './schema-size-class';

const statusMark = z.object({
  tone: z.enum(tones).describe('Semantic status tone.'),
  pulse: z.boolean().optional().describe('Animate the status pulse.'),
});

export const iconProps = z.object({
  name: iconSymbol.describe('An Argo icon or an SF and Material symbol pair.'),
  size: perSizeClass(iconSize).describe(
    'Semantic icon size, optionally by Size class.',
  ),
  filled: z.boolean().optional().describe('Use the platform filled variant.'),
  tone: z.enum(tones).optional().describe('Semantic symbol tone.'),
  status: statusMark.optional().describe('Status mark over the symbol.'),
});

export const avatarProps = z.object({
  name: z
    .string()
    .optional()
    .describe(
      'Name used for fallback initials; absent names show a person symbol.',
    ),
  src: imageAsset
    .optional()
    .describe(
      'Avatar resolved by argo.assets.resolve; loaded through the Server.',
    ),
  size: z
    .enum(['xs', 'sm', 'md', 'lg', 'xl'])
    .optional()
    .meta({ default: avatarDefaults.size })
    .describe('Avatar size.'),
  accessibilityLabel: z.string().describe('Spoken identity.'),
  status: statusMark
    .extend({ accessibilityLabel: z.string().optional() })
    .optional()
    .describe('Status mark over the avatar.'),
});

export const iconButtonProps = z.object({
  icon: iconSymbol.describe('The icon drawn by the button.'),
  accessibilityLabel: z.string().describe('Spoken action name.'),
  disabled: z.boolean().nullable().optional().describe('Disable activation.'),
  onPress: handler('onPress').optional().describe('Action run on activation.'),
  selected: z
    .boolean()
    .nullable()
    .optional()
    .describe('Draw the filled icon, for a button that is on.'),
  size: z
    .enum(iconButtonSizes)
    .optional()
    .meta({ default: iconButtonDefaults.size })
    .describe('Button size.'),
  variant: z
    .enum(['primary', 'secondary', 'ghost'])
    .optional()
    .meta({ default: iconButtonDefaults.variant })
    .describe('Button treatment.'),
});

export const filterPillProps = z.object({
  label: z.string().describe('Filter name.'),
  count: z.number().optional().describe('Count after the name.'),
  selected: z.boolean().describe('Whether the filter is selected.'),
  onPress: handler('onPress').describe('Action run on activation.'),
});

export const searchFieldProps = z.object({
  label: z.string().describe('Search name and placeholder.'),
  value: z.string().describe('Current query.'),
  onChangeText: handler('onChangeText').describe('Reports query edits.'),
});

export const calloutProps = z.object({
  tone: z
    .literal('danger')
    .optional()
    .describe('Error treatment; omit for information.'),
  title: z.string().describe('Callout heading.'),
  description: z.string().optional().describe('Supporting description.'),
  detail: z.string().optional().describe('Mono detail block.'),
  busy: z.boolean().optional().describe('Show work in progress.'),
});
