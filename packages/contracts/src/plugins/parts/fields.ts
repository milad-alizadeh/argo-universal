import { z } from 'zod';
import {
  part,
  stringLabel,
  optionalLabel,
  handler,
} from '../plugin-part-schema-utils';
import { fieldProps } from '../simple-kit-props';

export const fieldsPartSchemas = {
  Field: part('A Field wrapper around its child control.', fieldProps, {
    group: 'fields',
    wire: false,
    children: true,
    slots: {},
  }),
  FieldLayout: part(
    'A layout for a field label and its control.',
    z.object({ label: optionalLabel }),
    { group: 'fields', wire: false, children: true },
  ),
  FieldDescription: part(
    'Hint text associated with a Field.',
    z.object({ text: stringLabel }),
    { group: 'fields', wire: false },
  ),
  FieldErrors: part(
    'Validation messages associated with a Field.',
    z.object({ errors: z.array(z.string()) }),
    { group: 'fields', wire: false },
  ),
  Form: part(
    'A stacked form with a submit action and App-held drafts.',
    z.object({
      submitLabel: stringLabel.describe('The submit Button label.'),
      onSubmit: handler('onSubmit').describe('Submits every field value.'),
    }),
    {
      group: 'fields',
      children: [
        'Field',
        'TextInput',
        'Textarea',
        'Picker',
        'DatePicker',
        'Switch',
      ],
      events: { onSubmit: z.undefined().meta({ flush: true }) },
    },
  ),
};
