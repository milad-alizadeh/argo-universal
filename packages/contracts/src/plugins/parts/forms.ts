import { z } from 'zod';
import {
  part,
  stringLabel,
  optionalLabel,
  handler,
} from '../plugin-part-schema-utils';

export const formsPartSchemas = {
  Field: part(
    'A labeled wrapper around an input with hint and error content.',
    z.object({ label: stringLabel, required: z.boolean().optional() }),
    {
      slots: {
        control: [
          'TextInput',
          'Textarea',
          'Picker',
          'Combobox',
          'Checkbox',
          'Switch',
          'Slider',
          'DatePicker',
        ],
        description: ['FieldDescription'],
        errors: ['FieldErrors'],
      },
    },
  ),
  FieldLayout: part(
    'A layout for a field label and its control.',
    z.object({ label: optionalLabel }),
    { children: true },
  ),
  FieldDescription: part(
    'Hint text associated with a Field.',
    z.object({ text: stringLabel }),
  ),
  FieldErrors: part(
    'Validation messages associated with a Field.',
    z.object({ errors: z.array(z.string()) }),
  ),
  Form: part(
    'A stacked form with a submit action and App-held drafts.',
    z.object({ submitLabel: stringLabel, onSubmit: handler('onSubmit') }),
    { slots: { fields: ['Field'] } },
  ),
};
