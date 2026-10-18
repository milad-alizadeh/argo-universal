import { z } from 'zod';
import { searchFieldAccessibility } from '../part-accessibility-metadata';
import {
  part,
  stringLabel,
  optionalLabel,
  onPress,
} from '../plugin-part-schema-utils';

const selectionControlProps = z.object({
  label: stringLabel,
  checked: z.boolean().optional().describe('Whether the control is selected.'),
  disabled: z.boolean().optional().describe('Whether the control is disabled.'),
  onChange: z.boolean().optional().describe('The changed selection state.'),
});

export const inputsPartSchemas = {
  TextInput: part(
    'A single-line text input.',
    z.object({
      label: stringLabel,
      value: z.string().optional(),
      placeholder: optionalLabel,
      secure: z.boolean().optional().describe('Hide entered text.'),
      onChangeText: z.string().optional(),
    }),
    { label: 'The required `label` names the input.' },
  ),
  Textarea: part(
    'A multi-line text input.',
    z.object({
      label: stringLabel,
      value: z.string().optional(),
      placeholder: optionalLabel,
      onChangeText: z.string().optional(),
    }),
    { label: 'The required `label` names the input.' },
  ),
  SearchField: part(
    'Search input for Page headers and Lists.',
    z.object({
      value: z.string().optional(),
      placeholder: optionalLabel,
      onChangeText: z.string().optional(),
    }),
    {
      label: 'Defaults to the localized name “Search”.',
      accessibility: searchFieldAccessibility,
    },
  ),
  Picker: part(
    'A selection control, including multiple and segmented variants.',
    z.object({
      label: stringLabel,
      options: z.array(z.object({ label: stringLabel, value: z.string() })),
      value: z.union([z.string(), z.array(z.string())]).optional(),
      multiple: z.boolean().optional(),
      variant: z.enum(['menu', 'segmented']).optional(),
    }),
    { label: 'The required `label` names the selection control.' },
  ),
  FilterPill: part(
    'A toggleable filter chip.',
    z.object({
      label: stringLabel,
      selected: z.boolean().optional(),
      onPress: onPress.optional(),
    }),
    { events: { onPress: z.undefined() } },
  ),
  Combobox: part(
    'A searchable Picker.',
    z.object({
      label: stringLabel,
      options: z.array(z.object({ label: stringLabel, value: z.string() })),
      value: z.string().optional(),
      onChange: z.string().optional(),
    }),
    { label: 'The required `label` names the selection control.' },
  ),
  Checkbox: part(
    'A labeled binary or mixed selection control.',
    selectionControlProps,
    {
      label:
        'The required `label` names the control and is announced with its checked state.',
    },
  ),
  Switch: part('A labeled on/off control.', selectionControlProps, {
    label:
      'The required `label` names the control and is announced with its on/off state.',
  }),
  Slider: part(
    'A labeled numeric range control.',
    z.object({
      label: stringLabel,
      value: z.number(),
      min: z.number(),
      max: z.number(),
      step: z.number().optional(),
      onChange: z.number().optional(),
    }),
    {
      label:
        'The required `label` names the control; assistive technology announces its value and range.',
    },
  ),
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
