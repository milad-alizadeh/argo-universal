import { z } from 'zod';
import { echoes, handler } from './plugin-part-props';

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

type TextProps = Record<string, z.ZodType> & { value: z.ZodType };

type TextChangeEvents<Fields extends TextProps> = {
  onChangeText: z.ZodNonOptional<Fields['value']>;
};

// Typed text echoes at once and coalesces; Return sends it before submitting.
export const textChangeEvents = <Fields extends TextProps>(
  props: z.ZodObject<Fields>,
): TextChangeEvents<Fields> => ({
  onChangeText: echoes(props, 'value', { throttleMs: 150, blocks: false }),
});

export const textEvents = <Fields extends TextProps>(
  props: z.ZodObject<Fields>,
): TextChangeEvents<Fields> & { onSubmit: z.ZodUndefined } => ({
  ...textChangeEvents(props),
  onSubmit: z.undefined().meta({ flush: true }),
});

export const datePickerProps = z.object({
  label: z.string().describe('Spoken and visible field name.'),
  value: z
    .string()
    .optional()
    .describe(
      'Local ISO value: `YYYY-MM-DD`, `HH:mm`, or `YYYY-MM-DDTHH:mm` by mode.',
    ),
  mode: z
    .enum(['date', 'time', 'datetime'])
    .optional()
    .describe('Pick a date, a time, or both.'),
  onValueChange: handler('onValueChange').describe('Reports a picked value.'),
  required: z.boolean().optional().describe('The field requires a value.'),
  disabled: z.boolean().optional().describe('Disable picking.'),
});
