import { z } from 'zod';
import { echoes } from './plugin-part-props';
import { part } from './plugin-part-schema-utils';
import {
  pickerPartSchema,
  pickerSchema,
  comboboxSchema,
  menuChoice,
  menuSchema,
  splitButtonSchema,
} from './selection-schemas';
import { selectionValue } from './selection-value';

const pickerEvents = {
  onValueChange: echoes(pickerSchema, 'value'),
  onPress: z.undefined(),
};

const menuEvents = {
  onValueChange: echoes(menuChoice, 'value'),
  onPress: z.undefined(),
};

export const selectionPartSchemas = {
  Picker: part('A selection control.', pickerPartSchema, {
    events: {
      ...pickerEvents,
      // A multiple Picker echoes its whole list and stays open, so a toggle never locks it.
      onValueChange: z
        .union([selectionValue, z.array(selectionValue)])
        .meta({ value: 'value', blocks: false }),
    },
  }),
  Combobox: part('A searchable Picker.', comboboxSchema, {
    events: pickerEvents,
  }),
  Menu: part('A choice or action menu.', menuSchema, {
    events: menuEvents,
  }),
  SplitButton: part(
    'A primary action with a secondary action menu.',
    splitButtonSchema,
    {
      children: true,
      events: menuEvents,
    },
  ),
};
