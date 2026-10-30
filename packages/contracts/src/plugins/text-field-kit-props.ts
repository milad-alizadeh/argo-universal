import { z } from 'zod';
import { datePickerDefaults } from '../kit-tokens';
import { echoes, handler } from './kit-component-props';

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
    .meta({ default: datePickerDefaults.mode })
    .describe('Pick a date, a time, or both.'),
  onValueChange: handler('onValueChange').describe('Reports a picked value.'),
  required: z.boolean().optional().describe('The field requires a value.'),
  disabled: z.boolean().optional().describe('Disable picking.'),
});
