import { z } from 'zod';
import { iconName } from '../kit-symbols/icon-schema';
import { stockIcon } from '../kit-symbols/stock-icon-schema';
import { fieldGroupRowProps } from './field-group-row-props';
import { handler } from './plugin-part-props';
import { datePickerProps } from './text-field-kit-props';

// The rows that choose a value: a Picker from options, and a DatePicker from the calendar.

export const fieldGroupDatePickerProps = fieldGroupRowProps.extend(
  datePickerProps.pick({ value: true, mode: true, onValueChange: true }).shape,
);

// What AgentLogo draws: inline SVG markup, an SVG data URI, or the Registry's https icon URL. No other scheme is drawn.
const logoPattern = /^(\s*<svg[\s>/]|data:image\/svg\+xml|https:\/\/)/i;

const logoMaxLength = 100_000;

const fieldGroupPickerOption = z.object({
  value: z.string(),
  label: z.string(),
  subtitle: z.string().optional().describe('A second line under the label.'),
  icon: iconName.optional().describe('A leading icon.'),
  logo: z
    .string()
    .max(logoMaxLength)
    .regex(logoPattern)
    .optional()
    .describe(
      'A logo drawn in the icon’s place where the platform can draw an image in the row: inline `<svg` markup, a `data:image/svg+xml` URI or an `https://` URL, up to 100,000 characters, such as an Agent’s mark.',
    ),
  tone: z
    .literal('danger')
    .optional()
    .describe('`danger` draws the option in the destructive tone.'),
  pending: z
    .boolean()
    .optional()
    .describe(
      'The choice is being applied: a spinner stands where the check will be.',
    ),
  disabled: z
    .boolean()
    .optional()
    .describe('The option is drawn dimmed and cannot be chosen.'),
  section: z
    .string()
    .optional()
    .describe(
      'The heading of the section a page lists the option under; options with the same heading sit together.',
    ),
});

const pickerChoice = z.union([z.string(), z.array(z.string()).readonly()]);

export const fieldGroupPickerProps = fieldGroupRowProps.extend({
  value: pickerChoice.describe(
    'The chosen option value, or the list of them when `multiple`.',
  ),
  options: z
    .array(fieldGroupPickerOption)
    .readonly()
    .describe('The options to choose from.'),
  presentation: z
    .enum(['menu', 'page', 'inline'])
    .describe(
      'Where the choices open: `menu` in place, for a short known list; `page` on a page of their own, for a long or searchable one; `inline` as rows of the enclosing section with a check on the chosen ones, for a short list shown in place in a form.',
    ),
  summary: z
    .string()
    .optional()
    .describe(
      'The text shown for the current choice, in place of the chosen labels.',
    ),
  trigger: z
    .enum(['row', 'pill'])
    .optional()
    .describe(
      'What opens the choices: `row`, the default, is a FieldGroup row; `pill` is a label and a down chevron that sits in a toolbar or the Composer, outside a FieldGroup, and always opens the choices on a page or popover.',
    ),
  loading: z.boolean().optional().describe('The options are still loading.'),
  loadError: z
    .string()
    .optional()
    .describe('Why the options failed to load; shown below the rows.'),
  searchable: z
    .boolean()
    .optional()
    .describe('A search field above the choices; only a `page` has one.'),
  multiple: z
    .boolean()
    .optional()
    .describe('Several options can be chosen; `value` is then a list.'),
  footerAction: z
    .object({
      label: z.string(),
      icon: stockIcon.optional(),
      onPress: handler('onPress'),
    })
    .optional()
    .describe(
      'The `page`\'s one action, such as "Add Agents": in the pushed page\'s header on phones, an icon button when it has an icon; a button below the choices in a desktop popover, which has no header.',
    ),
  onValueChange: handler('onValueChange'),
});
