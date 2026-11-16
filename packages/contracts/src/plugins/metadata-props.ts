import { z } from 'zod';
import { iconSymbol } from '../kit-symbols/icon-schema';
import { tones } from '../kit-tokens';
import {
  fieldGroupPickerOption,
  pickerChoice,
} from './field-group-choice-props';
import { handler } from './kit-component-props';

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

export const metadataPickerProps = field.extend({
  value: pickerChoice.describe(
    'The chosen option value, or the list of them when `multiple`.',
  ),
  options: z
    .array(fieldGroupPickerOption)
    .readonly()
    .describe('The options to choose from.'),
  multiple: z
    .boolean()
    .optional()
    .describe(
      'Several options can be chosen; `value` is then a list, and a pick reports `onToggle` for that one option.',
    ),
  searchable: z
    .boolean()
    .optional()
    .describe('A search field above the choices.'),
  loading: z.boolean().optional().describe('The options are still loading.'),
  loadError: z
    .string()
    .optional()
    .describe('Why the options failed to load; shown below the rows.'),
  createLabel: z
    .string()
    .optional()
    .describe(
      'Offers to create what the search typed when no option has that name, as “<createLabel> “text””, such as “Create label”; a press reports `onCreate`.',
    ),
  onValueChange: handler('onValueChange')
    .optional()
    .describe('A single choice: the chosen option value.'),
  onToggle: handler('onToggle')
    .optional()
    .describe(
      'A `multiple` choice: the option pressed and whether it is now chosen.',
    ),
  onCreate: handler('onCreate')
    .optional()
    .describe('The text of the option to create.'),
});

export const metadataChildComponents = [
  'Metadata.Label',
  'Metadata.Link',
  'Metadata.Pills',
  'Metadata.StatusDot',
  'Metadata.Avatar',
  'Metadata.Picker',
] as const;
