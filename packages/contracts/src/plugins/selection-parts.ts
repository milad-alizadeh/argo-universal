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

// A draft Picker may leave `onValueChange` off the wire: the App holds the draft.
const [onePick, manyPicks] = pickerPartSchema.options;

const pickerDraft = z.union([
  onePick.extend({ onValueChange: onePick.shape.onValueChange.optional() }),
  manyPicks.extend({
    onValueChange: manyPicks.shape.onValueChange.optional(),
  }),
]);

const [withChoices, withActions] = splitButtonSchema.options;

const splitButtonDraft = z.union([
  withChoices.extend({
    onValueChange: withChoices.shape.onValueChange.optional(),
  }),
  withActions,
]);

const menuEvents = {
  onValueChange: echoes(menuChoice, 'value'),
  onPress: z.undefined(),
};

export const selectionPartSchemas = {
  Picker: part('A selection control.', pickerPartSchema, {
    group: 'inputs',
    wireProps: pickerDraft,
    events: {
      ...pickerEvents,
      // A multiple Picker echoes its whole list and stays open, so a toggle never locks it.
      onValueChange: z
        .union([selectionValue, z.array(selectionValue)])
        .meta({ value: 'value', blocks: false }),
    },
  }),
  Combobox: part('A searchable Picker.', comboboxSchema, {
    group: 'inputs',
    wire: false,
    events: pickerEvents,
  }),
  Menu: part('A choice or action menu.', menuSchema, {
    group: 'overlays',
    wire: false,
    events: menuEvents,
  }),
  SplitButton: part(
    'A primary action with a secondary action menu.',
    splitButtonSchema,
    {
      group: 'actions',
      wireProps: splitButtonDraft,
      children: true,
      events: menuEvents,
    },
  ),
};
