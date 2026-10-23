import { z } from 'zod';
import { iconName } from '../kit-symbols/icon-schema';
import { fieldGroupRowProps } from './field-group-row-props';
import { handler } from './plugin-part-props';
import { datePickerProps } from './text-field-kit-props';

// The rows that choose a value: a Picker from options, and a DatePicker from the calendar.

export const fieldGroupDatePickerProps = fieldGroupRowProps.extend(
  datePickerProps.pick({ value: true, mode: true, onValueChange: true }).shape,
);

export const fieldGroupPickerOption = z.object({
  value: z.string(),
  label: z.string(),
  subtitle: z.string().optional().describe('A second line under the label.'),
  icon: iconName.optional().describe('A leading icon.'),
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
    .object({ label: z.string(), onPress: handler('onPress') })
    .optional()
    .describe(
      'A button in a section of its own below the choices of a `page`, such as "Add Agents".',
    ),
  onValueChange: handler('onValueChange'),
});
