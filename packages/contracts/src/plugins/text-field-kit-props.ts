import { z } from 'zod';
import { handler } from './plugin-part-props';

export const textFieldProps = z.object({
  label: z.string().describe('Spoken and visible field name.'),
  value: z.string().describe('Current field value.'),
  onChangeText: handler('onChangeText').describe('Reports value edits.'),
  placeholder: z.string().optional().describe('Example shown while empty.'),
  mono: z.boolean().optional().describe('Draw code in the mono face.'),
  disabled: z.boolean().optional().describe('Disable edits.'),
  loading: z.boolean().optional().describe('Value validation is running.'),
  focusOnOpen: z.boolean().optional().describe('Take focus on opening.'),
  selectOnFocus: z.boolean().optional().describe('Select the value on focus.'),
  onSubmit: handler('onSubmit')
    .optional()
    .describe('Submit on Return or Enter.'),
  required: z.boolean().optional().describe('The field requires a value.'),
  numeric: z.boolean().optional().describe('Use a numeric keyboard.'),
  secure: z.boolean().optional().describe('Mask secret entry.'),
  labelHidden: z.boolean().optional().describe('Hide the visible label.'),
});

export const textareaProps = z.object({
  value: z.string().optional().describe('Current field value.'),
  placeholder: z.string().optional().describe('Example shown while empty.'),
  onChangeText: handler('onChangeText')
    .optional()
    .describe('Reports value edits.'),
  disabled: z.boolean().optional().describe('Disable edits.'),
});

// Typed text echoes at once and coalesces; Return sends it before submitting.
const editedText = z
  .string()
  .meta({ throttleMs: 150, value: 'value', blocks: false });

export const textEvents = {
  onChangeText: editedText,
  onSubmit: z.undefined().meta({ flush: true }),
};

export const textChangeEvents = { onChangeText: editedText };
