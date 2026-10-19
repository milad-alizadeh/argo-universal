import { z } from 'zod';
import { echoes } from './plugin-part-props';
import { part, stringLabel, onPress } from './plugin-part-schema-utils';
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

const legacyPicker = z.object({
  label: stringLabel,
  options: z.array(z.object({ label: stringLabel, value: z.string() })),
  value: z.union([z.string(), z.array(z.string())]).optional(),
  multiple: z.boolean().optional(),
  variant: z.enum(['menu', 'segmented']).optional(),
});

function oldPicker(
  props: z.output<typeof pickerPartSchema>,
): z.input<typeof legacyPicker> {
  const legacy: z.input<typeof legacyPicker> = {
    label: props.label,
    options: [...props.options],
    variant: 'menu',
  };

  if (props.multiple) legacy.multiple = true;

  if (props.value !== undefined) legacy.value = legacyValue(props.value);

  return legacy;
}

const legacyValue = (value: string | readonly string[]): string | string[] =>
  typeof value === 'string' ? value : [...value];

export const selectionPartSchemas = {
  Picker: part('A selection control.', pickerPartSchema, {
    events: {
      ...pickerEvents,
      // A multiple Picker echoes its whole list and stays open, so a toggle never locks it.
      onValueChange: z
        .union([selectionValue, z.array(selectionValue)])
        .meta({ value: 'value', blocks: false }),
    },
    previous: [pickerPartSchema.transform(oldPicker).pipe(legacyPicker)],
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
