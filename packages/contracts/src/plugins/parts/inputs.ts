import { z } from 'zod';
import { legacyBinaryProps, legacySliderProps } from '../legacy-control-props';
import { searchFieldAccessibility } from '../part-accessibility-metadata';
import { echoes } from '../plugin-part-props';
import {
  part,
  stringLabel,
  optionalLabel,
  onPress,
} from '../plugin-part-schema-utils';
import { searchFieldProps } from '../presentation-kit-props';
import { filterPillProps } from '../presentation-kit-props';
import { selectionPartSchemas } from '../selection-parts';
import {
  datePickerProps,
  textChangeEvents,
  textareaProps,
  textEvents,
  textFieldProps,
} from '../text-field-kit-props';
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
  onChangeText: z.string().optional(),
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
    events: textEvents(textFieldProps),
  }),
  Textarea: part('A multi-line text input.', textareaProps, {
    label: 'The surrounding Field or control supplies the accessible name.',
    previous: [
      z.object({
        label: stringLabel,
        value: z.string().optional(),
        placeholder: optionalLabel,
        onChangeText: z.string().optional(),
      }),
    ],
    events: textChangeEvents(textareaProps),
  }),
  SearchField: part(
    'Search input for Page headers and Lists.',
    searchFieldProps,
    {
      label:
        'The required label names the search and supplies its placeholder.',
      accessibility: searchFieldAccessibility,
      previous: [
        searchFieldProps
          .transform((props): z.input<typeof legacySearchField> => ({
            value: props.value,
            placeholder: props.label,
          }))
          .pipe(legacySearchField),
      ],
      events: textChangeEvents(searchFieldProps),
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
      events: { onValueChange: echoes(checkboxProps, 'value') },
      label: 'The label names the control and is announced with its value.',
    },
  ),
  Switch: part('An on/off control.', switchProps, {
    previous: [
      switchProps.transform(legacyBinaryProps).pipe(selectionControlV1),
    ],
    events: { onValueChange: echoes(switchProps, 'value') },
    label:
      'Set accessibilityLabel when the surrounding row does not name the control.',
  }),
  Slider: part('A labeled numeric range control.', sliderProps, {
    previous: [sliderProps.transform(legacySliderProps).pipe(sliderV1)],
    events: {
      onValueChange: echoes(sliderProps, 'value', {
        throttleMs: 150,
        blocks: false,
      }),
    },
    label:
      'The accessibilityLabel names the control; its value and range are announced.',
  }),
  DatePicker: part(
    'A native date, time, or combined picker.',
    datePickerProps,
    {
      label: 'The required `label` names the picker.',
      previous: [
        z.object({
          label: stringLabel,
          value: z.string().optional(),
          mode: z.enum(['date', 'time', 'datetime']).optional(),
        }),
      ],
      events: { onValueChange: echoes(datePickerProps, 'value') },
    },
  ),
};
