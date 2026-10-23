import { z } from 'zod';
import { iconName } from '../kit-symbols/icon-schema';
import { stockIcon } from '../kit-symbols/stock-icon-schema';
import { rowPress } from './list-kit-props';
import { echoes, handler } from './plugin-part-props';
import { textChangeEvents } from './text-field-kit-props';

// The App's FieldGroup and its rows (ADR-0042): one schema per component, shared by web, iOS and Android and by the Plugin wire.

export const fieldGroupProps = z.object({
  disabled: z.boolean().optional().describe('Every row holds still.'),
});

export const fieldGroupSectionProps = z.object({
  title: z.string().optional().describe('The heading above the section.'),
  footer: z.string().optional().describe('Supporting text below the section.'),
});

/*
 * Every row mirrors Expo UI's universal ListItem: a `title`, a `leading` icon, and
 * what sits at the end (`trailing` is each control's own value). A row has no free Slots.
 */
export const fieldGroupFieldProps = z.object({
  title: z.string().describe('The row’s label.'),
  disabled: z.boolean().optional().describe('Whether the row is disabled.'),
});

// A row that leads with an icon, as Expo UI's universal ListItem does.
export const fieldGroupRowProps = fieldGroupFieldProps.extend({
  leading: stockIcon
    .optional()
    .describe('A leading SF Symbol and Material Symbol.'),
});

export const fieldGroupToggleProps = fieldGroupFieldProps.extend({
  value: z.boolean().describe('Whether the field is on.'),
  onValueChange: handler('onValueChange'),
});

export const fieldGroupTextFieldProps = fieldGroupRowProps.extend({
  value: z.string().describe('The current text.'),
  onChangeText: handler('onChangeText'),
  placeholder: z.string().optional().describe('Example shown while empty.'),
  error: z.string().optional().describe('Why the value is not accepted.'),
  keyboardType: z
    .enum([
      'default',
      'number-pad',
      'decimal-pad',
      'numeric',
      'email-address',
      'phone-pad',
      'url',
    ])
    .optional()
    .describe(
      'The keyboard Expo UI TextInput shows; a number is a number-pad or decimal-pad.',
    ),
  onBlur: handler('onBlur').optional(),
  onSubmit: handler('onSubmit').optional(),
});

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
    .enum(['menu', 'page'])
    .describe(
      'Where the choices open: `menu` in place, for a short known list; `page` on a page of their own, for a long or searchable one.',
    ),
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

export const fieldGroupSliderProps = fieldGroupFieldProps.extend({
  value: z.number().finite().describe('The current value.'),
  min: z.number().finite().describe('The minimum value.'),
  max: z.number().finite().describe('The maximum value.'),
  step: z.number().positive().optional().describe('The increment.'),
  onValueChange: handler('onValueChange'),
});

export const fieldGroupValueProps = fieldGroupRowProps.extend({
  value: z.string().describe('The read-only value at the row’s end.'),
});

export const fieldGroupLinkProps = fieldGroupRowProps.extend({
  onPress: handler('onPress'),
});

const pressEvents = { onPress: rowPress };

const textEvents = {
  ...textChangeEvents(fieldGroupTextFieldProps),
  onBlur: z.undefined(),
  onSubmit: z.undefined(),
};

export const fieldGroupKitParts = {
  FieldGroup: { props: fieldGroupProps, events: {} },
  'FieldGroup.Section': { props: fieldGroupSectionProps, events: {} },
  'FieldGroup.Value': { props: fieldGroupValueProps, events: {} },
  'FieldGroup.Link': { props: fieldGroupLinkProps, events: pressEvents },
  'FieldGroup.Toggle': {
    props: fieldGroupToggleProps,
    events: { onValueChange: echoes(fieldGroupToggleProps, 'value') },
  },
  'FieldGroup.TextField': {
    props: fieldGroupTextFieldProps,
    events: textEvents,
  },
  'FieldGroup.SecretField': {
    props: fieldGroupTextFieldProps,
    events: textEvents,
  },
  'FieldGroup.Picker': {
    props: fieldGroupPickerProps,
    events: {
      // A multiple Picker echoes its whole list and stays open, so a toggle never locks it.
      onValueChange: echoes(fieldGroupPickerProps, 'value', { blocks: false }),
      // The footer action's press, inside the action data.
      onPress: z.undefined(),
    },
  },
  'FieldGroup.Slider': {
    props: fieldGroupSliderProps,
    events: { onValueChange: echoes(fieldGroupSliderProps, 'value') },
  },
} as const;

export type FieldGroupKitPart = keyof typeof fieldGroupKitParts;

export type FieldGroupSchemaProps<Name extends FieldGroupKitPart> = z.output<
  (typeof fieldGroupKitParts)[Name]['props']
>;

export type FieldGroupEvents<Name extends FieldGroupKitPart> =
  (typeof fieldGroupKitParts)[Name]['events'];
