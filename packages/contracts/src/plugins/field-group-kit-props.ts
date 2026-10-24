import { z } from 'zod';
import {
  fieldGroupDatePickerProps,
  fieldGroupPickerProps,
} from './field-group-choice-props';
import {
  fieldGroupFieldProps,
  fieldGroupRowProps,
} from './field-group-row-props';
import { rowPress } from './list-kit-props';
import { echoes, handler } from './plugin-part-props';
import { textChangeEvents } from './text-field-kit-props';

// The App's FieldGroup and its rows (ADR-0042): one schema per component, shared by web, iOS and Android and by the Plugin wire.

const fieldGroupProps = z.object({
  disabled: z.boolean().optional().describe('Every row holds still.'),
});

const fieldGroupSectionProps = z.object({
  title: z.string().optional().describe('The heading above the section.'),
  footer: z.string().optional().describe('Supporting text below the section.'),
});

const fieldGroupToggleProps = fieldGroupFieldProps.extend({
  value: z.boolean().describe('Whether the field is on.'),
  onValueChange: handler('onValueChange'),
});

const fieldGroupTextFieldProps = fieldGroupRowProps.extend({
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
  multiline: z
    .boolean()
    .optional()
    .describe(
      'The field grows with its text over several lines, for a long answer.',
    ),
  hideTitle: z
    .boolean()
    .optional()
    .describe(
      'The title names the field for assistive technology but is not drawn, for a field whose surroundings already name it.',
    ),
  autoFocus: z
    .boolean()
    .optional()
    .describe(
      'Focus the field as the row appears; on Android, open its dialog.',
    ),
  selectTextOnFocus: z
    .boolean()
    .optional()
    .describe('Select all of the text when the field takes focus.'),
  onFocus: handler('onFocus').optional(),
  onBlur: handler('onBlur').optional(),
  onSubmit: handler('onSubmit').optional(),
});

const fieldGroupSliderProps = fieldGroupFieldProps.extend({
  value: z.number().finite().describe('The current value.'),
  min: z.number().finite().describe('The minimum value.'),
  max: z.number().finite().describe('The maximum value.'),
  step: z.number().positive().optional().describe('The increment.'),
  valueLabel: z
    .string()
    .optional()
    .describe(
      'The value in words, such as “Medium”: shown at the row’s end and announced with the title by assistive technology.',
    ),
  onValueChange: handler('onValueChange'),
});

const fieldGroupValueProps = fieldGroupRowProps.extend({
  value: z.string().describe('The read-only value at the row’s end.'),
  loading: z
    .boolean()
    .optional()
    .describe(
      'The row is a placeholder while its value is on its way: a bar as wide as the title stands in for it, and assistive technology skips it.',
    ),
});

const fieldGroupLinkProps = fieldGroupRowProps.extend({
  value: z
    .string()
    .optional()
    .describe(
      'What the page it opens holds, such as a count: before the chevron on iOS and the web, under the title on Android.',
    ),
  onPress: handler('onPress'),
});

const pressEvents = { onPress: rowPress };

const textEvents = {
  ...textChangeEvents(fieldGroupTextFieldProps),
  onFocus: z.undefined(),
  onBlur: z.undefined(),
  // Return sends the typed text before it submits.
  onSubmit: z.undefined().meta({ flush: true }),
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
  'FieldGroup.DatePicker': {
    props: fieldGroupDatePickerProps,
    events: { onValueChange: echoes(fieldGroupDatePickerProps, 'value') },
  },
  'FieldGroup.Picker': {
    props: fieldGroupPickerProps,
    events: {
      // A multiple Picker echoes its whole list and stays open, so a toggle never locks it.
      onValueChange: echoes(fieldGroupPickerProps, 'value', { blocks: false }),
      // The footer action's press, inside the action data.
      onPress: z.undefined().meta({ within: 'footerAction' }),
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
