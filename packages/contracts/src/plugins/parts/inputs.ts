import { z } from 'zod';
import { legacyBinaryProps, legacySliderProps } from '../legacy-control-props';
import { searchFieldAccessibility } from '../part-accessibility-metadata';
import {
  part,
  stringLabel,
  optionalLabel,
  onPress,
  handler,
} from '../plugin-part-schema-utils';
import { searchFieldProps } from '../presentation-kit-props';
import { filterPillProps } from '../presentation-kit-props';
import { selectionPartSchemas } from '../selection-parts';
import { textareaProps } from '../text-field-kit-props';
import { textFieldProps } from '../text-field-kit-props';
import {
  selectionControlV1,
  switchProps,
  checkboxProps,
  sliderV1,
  sliderProps,
} from './input-control-props';

const legacySearchField = z.object({
  value: z.string().optional(),
  placeholder: optionalLabel,
  onChangeText: z.union([z.string(), handler('onChangeText')]).optional(),
});

export const inputsPartSchemas = {
  TextInput: part('A single-line text input.', textFieldProps, {
    label: 'The required `label` names the input.',
    previous: [
      z.object({
        label: stringLabel,
        value: z.string().optional(),
        placeholder: optionalLabel,
        secure: z.boolean().optional().describe('Hide entered text.'),
        onChangeText: z.string().optional(),
      }),
    ],
    events: { onChangeText: z.string() },
  }),
  Textarea: part('A multi-line text input.', textareaProps, {
    label: 'The required `label` names the input.',
    previous: [
      z.object({
        label: stringLabel,
        value: z.string().optional(),
        placeholder: optionalLabel,
        onChangeText: z.string().optional(),
      }),
    ],
    events: { onChangeText: z.string() },
  }),
  SearchField: part(
    'Search input for Page headers and Lists.',
    searchFieldProps,
    {
      label: 'Defaults to the localized name “Search”.',
      accessibility: searchFieldAccessibility,
      previous: [
        searchFieldProps
          .transform((props): z.input<typeof legacySearchField> => ({
            ...props,
            placeholder: props.label,
          }))
          .pipe(legacySearchField),
      ],
      events: { onChangeText: z.string() },
      slots: { title: ['Text', 'Stack'], actions: ['Button', 'IconButton'] },
    },
  ),
  Picker: selectionPartSchemas.Picker,
  FilterPill: part('A toggleable filter chip.', filterPillProps, {
    events: { onPress: z.undefined() },
    previous: [
      z.object({
        label: stringLabel,
        selected: z.boolean().optional(),
        onPress: onPress.optional(),
      }),
    ],
  }),
  Combobox: selectionPartSchemas.Combobox,
  Checkbox: part(
    'A labeled binary or mixed selection control.',
    checkboxProps,
    {
      previous: [
        checkboxProps.transform(legacyBinaryProps).pipe(selectionControlV1),
      ],
      events: { onValueChange: z.boolean() },
      label: 'The label names the control and is announced with its value.',
    },
  ),
  Switch: part('An on/off control.', switchProps, {
    previous: [
      switchProps.transform(legacyBinaryProps).pipe(selectionControlV1),
    ],
    events: { onValueChange: z.boolean() },
    label:
      'Set accessibilityLabel when the surrounding row does not name the control.',
  }),
  Slider: part('A labeled numeric range control.', sliderProps, {
    previous: [sliderProps.transform(legacySliderProps).pipe(sliderV1)],
    events: { onValueChange: z.number() },
    label:
      'The accessibilityLabel names the control; its value and range are announced.',
  }),
  DatePicker: part(
    'A native date, time, or combined picker.',
    z.object({
      label: stringLabel,
      value: z.string().optional(),
      mode: z.enum(['date', 'time', 'datetime']).optional(),
    }),
    { label: 'The required `label` names the picker.' },
  ),
};
