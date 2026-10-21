import { z } from 'zod';
import { iconSymbol, iconRole } from '../kit-symbols/icon-schema';
import { tones } from '../kit-tokens';
import { imageAsset } from './image-wire-part';
import { handler } from './plugin-part-props';
import { perSizeClass } from './schema-size-class';

export const statusMark = z.object({
  tone: z.enum(tones).describe('Semantic status tone.'),
  pulse: z.boolean().optional().describe('Animate the status pulse.'),
});

export const iconProps = z.object({
  name: iconSymbol.describe('An Argo icon or an SF and Material symbol pair.'),
  role: perSizeClass(iconRole).describe(
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
  tone: z.literal('danger').optional().describe('Danger treatment.'),
  size: z
    .enum(['xs', 'sm', 'md', 'lg', 'xl'])
    .optional()
    .describe('Button size.'),
  loading: z.boolean().optional().describe('The action is running.'),
  variant: z
    .enum(['default', 'ghost', 'outline', 'filled'])
    .optional()
    .describe('Button treatment.'),
  selected: z
    .boolean()
    .optional()
    .describe('Toggle selection; omit for a plain button.'),
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
