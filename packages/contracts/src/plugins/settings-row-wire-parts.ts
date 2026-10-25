import { rowPress } from './list-kit-props';
import { echoes } from './plugin-part-props';
import { part } from './plugin-part-schema-utils';
import {
  listLinkProps,
  listToggleProps,
  listPickerProps,
  listStepperProps,
  listTextFieldProps,
  listButtonProps,
} from './settings-row-props';
import { textEvents } from './text-field-kit-props';

const leadingSlot = {
  leading: ['Icon', 'Avatar', 'Image', 'Text', 'Label', 'Svg'],
} as const;

export const settingsRowWireParts = {
  'ListItem.Link': part('A settings navigation row.', listLinkProps, {
    group: 'lists',
    slots: leadingSlot,
    events: { onPress: rowPress },
  }),
  'ListItem.Toggle': part(
    'A settings switch row; the whole row toggles.',
    listToggleProps,
    {
      group: 'lists',
      slots: leadingSlot,
      events: { onValueChange: echoes(listToggleProps, 'value') },
    },
  ),
  'ListItem.Picker': part('A settings choice control.', listPickerProps, {
    group: 'lists',
    slots: leadingSlot,
    events: { onValueChange: echoes(listPickerProps, 'value') },
  }),
  'ListItem.Stepper': part('A settings numeric stepper.', listStepperProps, {
    group: 'lists',
    slots: leadingSlot,
    events: { onValueChange: echoes(listStepperProps, 'value') },
  }),
  'ListItem.TextField': part(
    'A text field in a settings form.',
    listTextFieldProps,
    { group: 'lists', events: textEvents(listTextFieldProps) },
  ),
  'ListItem.Button': part('A settings action row.', listButtonProps, {
    group: 'lists',
    slots: leadingSlot,
    events: { onPress: rowPress },
  }),
} as const;
