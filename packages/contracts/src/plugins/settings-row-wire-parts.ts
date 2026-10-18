import { z } from 'zod';
import { textUi, valueUi } from './part-ui';
import { part } from './plugin-part-schema-utils';
import {
  listLinkProps,
  listToggleProps,
  listPickerProps,
  listStepperProps,
  listTextFieldProps,
  listButtonProps,
} from './settings-row-props';

const leadingSlot = {
  leading: ['Icon', 'Avatar', 'Image', 'Text', 'Label', 'Svg'],
} as const;

export const settingsRowWireParts = {
  'ListItem.Link': part('A settings navigation row.', listLinkProps, {
    slots: leadingSlot,
  }),
  'ListItem.Toggle': part(
    'A settings switch row; the whole row toggles.',
    listToggleProps,
    { ui: valueUi, slots: leadingSlot, events: { onValueChange: z.boolean() } },
  ),
  'ListItem.Picker': part('A settings choice control.', listPickerProps, {
    slots: leadingSlot,
    ui: valueUi,
    events: { onValueChange: z.string() },
  }),
  'ListItem.Stepper': part('A settings numeric stepper.', listStepperProps, {
    slots: leadingSlot,
    ui: valueUi,
    events: { onValueChange: z.number() },
  }),
  'ListItem.TextField': part(
    'A text field in a settings form.',
    listTextFieldProps,
    { ui: textUi, events: { onChangeText: z.string() } },
  ),
  'ListItem.Button': part('A settings action row.', listButtonProps, {
    slots: leadingSlot,
  }),
} as const;
