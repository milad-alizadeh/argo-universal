import { z } from 'zod';
import { part, stringLabel, onPress } from './plugin-part-schema-utils';
import {
  pickerSchema,
  comboboxSchema,
  menuSchema,
  splitButtonSchema,
} from './selection-schemas';
import { selectionValue } from './selection-value';

const events = {
  onValueChange: selectionValue,
  onPress: z.undefined(),
};

export const selectionPartSchemas = {
  Picker: part('A selection control.', pickerSchema, {
    events,
    previous: [
      z.object({
        label: stringLabel,
        options: z.array(z.object({ label: stringLabel, value: z.string() })),
        value: z.union([z.string(), z.array(z.string())]).optional(),
        multiple: z.boolean().optional(),
        variant: z.enum(['menu', 'segmented']).optional(),
      }),
    ],
  }),
  Combobox: part('A searchable Picker.', comboboxSchema, {
    events,
    previous: [
      z.object({
        label: stringLabel,
        options: z.array(z.object({ label: stringLabel, value: z.string() })),
        value: z.string().optional(),
        onChange: z.string().optional(),
      }),
    ],
  }),
  Menu: part('A choice or action menu.', menuSchema, {
    events,
    previous: [z.object({})],
  }),
  SplitButton: part(
    'A primary action with a secondary action menu.',
    splitButtonSchema,
    {
      events,
      previous: [
        z.object({
          label: stringLabel,
          actions: z.array(z.object({ label: stringLabel, onPress })),
        }),
      ],
    },
  ),
};
