import { z } from 'zod';
import { searchFieldAccessibility } from '../part-accessibility-metadata';
import { echoes } from '../plugin-part-props';
import { part } from '../plugin-part-schema-utils';
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
import { switchProps, checkboxProps, sliderProps } from './input-control-props';

export const inputsPartSchemas = {
  TextInput: part('A single-line text input.', textFieldProps, {
    label: 'The required `label` names the input.',
    events: textEvents(textFieldProps),
  }),
  Textarea: part('A multi-line text input.', textareaProps, {
    label: 'The surrounding Field or control supplies the accessible name.',
    events: textChangeEvents(textareaProps),
  }),
  SearchField: part(
    'Search input for Page headers and Lists.',
    searchFieldProps,
    {
      label:
        'The required label names the search and supplies its placeholder.',
      accessibility: searchFieldAccessibility,
      events: textChangeEvents(searchFieldProps),
      slots: { title: ['Text', 'Stack'], actions: ['Button', 'IconButton'] },
    },
  ),
  Picker: selectionPartSchemas.Picker,
  FilterPill: part('A toggleable filter chip.', filterPillProps, {
    events: { onPress: z.undefined() },
  }),
  Combobox: selectionPartSchemas.Combobox,
  Checkbox: part(
    'A labeled binary or mixed selection control.',
    checkboxProps,
    {
      events: { onValueChange: echoes(checkboxProps, 'value') },
      label: 'The label names the control and is announced with its value.',
    },
  ),
  Switch: part('An on/off control.', switchProps, {
    events: { onValueChange: echoes(switchProps, 'value') },
    label:
      'Set accessibilityLabel when the surrounding row does not name the control.',
  }),
  Slider: part('A labeled numeric range control.', sliderProps, {
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
      events: { onValueChange: echoes(datePickerProps, 'value') },
    },
  ),
};
