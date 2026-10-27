import { z } from 'zod';
import { handler, stringLabel } from '../plugin-part-props';

export const sliderProps = z.object({
  value: z.number().optional().describe('The current range value.'),
  minimumValue: z.number().describe('The lowest allowed value.'),
  maximumValue: z.number().describe('The highest allowed value.'),
  step: z.number().describe('The increment between allowed values.'),
  // A draft Slider may leave its handler off: the App holds the draft.
  onValueChange: handler('onValueChange')
    .optional()
    .describe('Called with the new range value.'),
  accessibilityLabel: stringLabel.describe(
    'The spoken name of the range control.',
  ),
  valueLabel: z
    .string()
    .describe('The displayed description of the current value.'),
  disabled: z.boolean().optional().describe('Whether interaction is disabled.'),
});
