import { z } from 'zod';
import { echoes } from './plugin-part-props';
import { part, stringLabel, onPress } from './plugin-part-schema-utils';
import {
  pickerSchema,
  comboboxSchema,
  menuChoice,
  menuSchema,
  splitButtonSchema,
} from './selection-schemas';

const pickerEvents = {
  onValueChange: echoes(pickerSchema, 'value'),
  onPress: z.undefined(),
};

const menuEvents = {
  onValueChange: echoes(menuChoice, 'value'),
  onPress: z.undefined(),
};

const legacyPicker = z.object({
  label: stringLabel,
  options: z.array(z.object({ label: stringLabel, value: z.string() })),
  value: z.union([z.string(), z.array(z.string())]).optional(),
  multiple: z.boolean().optional(),
  variant: z.enum(['menu', 'segmented']).optional(),
});

function oldPicker(
  props: z.output<typeof pickerSchema>,
): z.input<typeof legacyPicker> {
  const legacy: z.input<typeof legacyPicker> = {
    label: props.label,
    options: [...props.options],
    variant: 'menu',
  };

  if (props.value !== undefined) legacy.value = props.value;

  return legacy;
}

export const selectionPartSchemas = {
  Picker: part('A selection control.', pickerSchema, {
    events: pickerEvents,
    previous: [pickerSchema.transform(oldPicker).pipe(legacyPicker)],
  }),
  Combobox: part('A searchable Picker.', comboboxSchema, {
    events: pickerEvents,
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
    events: menuEvents,
    previous: [z.object({})],
  }),
  SplitButton: part(
    'A primary action with a secondary action menu.',
    splitButtonSchema,
    {
      children: true,
      events: menuEvents,
      previous: [
        z.object({
          label: stringLabel,
          actions: z.array(z.object({ label: stringLabel, onPress })),
        }),
      ],
    },
  ),
};
