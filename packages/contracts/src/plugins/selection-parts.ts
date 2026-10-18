import { z } from 'zod';
import { valueUi } from './part-ui';
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
    ui: valueUi,
    events,
    previous: [pickerSchema.transform(oldPicker).pipe(legacyPicker)],
  }),
  Combobox: part('A searchable Picker.', comboboxSchema, {
    ui: valueUi,
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
    ui: valueUi,
    events,
    previous: [z.object({})],
  }),
  SplitButton: part(
    'A primary action with a secondary action menu.',
    splitButtonSchema,
    {
      ui: { ...valueUi, pending: { onPress: 'disabled' } },
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
