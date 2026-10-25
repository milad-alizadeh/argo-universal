import { z } from 'zod';
import { echoes } from '../plugin-part-props';
import { part } from '../plugin-part-schema-utils';
import { searchFieldProps } from '../presentation-kit-props';
import { filterPillProps } from '../presentation-kit-props';
import {
  datePickerProps,
  textChangeEvents,
  textareaProps,
  textEvents,
  textFieldProps,
} from '../text-field-kit-props';
import { switchProps, checkboxProps, sliderProps } from './input-control-props';

// A draft control may leave its handler off the wire: the App holds the draft.
const textDraft = textFieldProps.extend({
  onChangeText: textFieldProps.shape.onChangeText.optional(),
});

const checkboxDraft = checkboxProps.extend({
  onValueChange: checkboxProps.shape.onValueChange.optional(),
});

const switchDraft = switchProps.extend({
  onValueChange: switchProps.shape.onValueChange.optional(),
});

const sliderDraft = sliderProps.extend({
  onValueChange: sliderProps.shape.onValueChange.optional(),
});

const datePickerDraft = datePickerProps.extend({
  onValueChange: datePickerProps.shape.onValueChange.optional(),
});

export const inputsPartSchemas = {
  TextInput: part('A single-line text input.', textFieldProps, {
    group: 'inputs',
    wireProps: textDraft,
    label: 'The required `label` names the input.',
    events: textEvents(textFieldProps),
  }),
  Textarea: part('A multi-line text input.', textareaProps, {
    group: 'inputs',
    wire: false,
    label: 'The surrounding Field or control supplies the accessible name.',
    events: textChangeEvents(textareaProps),
  }),
  SearchField: part(
    'Search input for Page headers and Lists.',
    searchFieldProps,
    {
      group: 'inputs',
      wire: false,
      label:
        'The required label names the search and supplies its placeholder.',
      accessibility: {
        keyboard:
          'Keyboard focus reaches the Search field in platform order; typing updates its App-owned value and dispatches onChangeText.',
        voiceOver:
          'VoiceOver exposes a search text field, reads the localized Search name, and reports its current value.',
        talkBack:
          'TalkBack exposes a search text field, reads the localized Search name, and reports its current value.',
      },
      events: textChangeEvents(searchFieldProps),
      slots: { title: ['Text', 'Stack'], actions: ['Button', 'IconButton'] },
    },
  ),
  FilterPill: part('A toggleable filter chip.', filterPillProps, {
    group: 'inputs',
    wire: false,
    events: { onPress: z.undefined() },
  }),
  Checkbox: part(
    'A labeled binary or mixed selection control.',
    checkboxProps,
    {
      group: 'inputs',
      wireProps: checkboxDraft,
      events: { onValueChange: echoes(checkboxProps, 'value') },
      label: 'The label names the control and is announced with its value.',
    },
  ),
  Switch: part('An on/off control.', switchProps, {
    group: 'inputs',
    wireProps: switchDraft,
    events: { onValueChange: echoes(switchProps, 'value') },
    label:
      'Set accessibilityLabel when the surrounding row does not name the control.',
  }),
  Slider: part('A labeled numeric range control.', sliderProps, {
    group: 'inputs',
    wireProps: sliderDraft,
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
      group: 'inputs',
      wireProps: datePickerDraft,
      label: 'The required `label` names the picker.',
      events: { onValueChange: echoes(datePickerProps, 'value') },
    },
  ),
};
