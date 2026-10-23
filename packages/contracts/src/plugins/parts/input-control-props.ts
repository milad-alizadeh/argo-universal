import { z } from 'zod';
import { handler, stringLabel } from '../plugin-part-props';

const binaryControlProps = z.object({
  value: z.boolean().describe('The current on or off state.'),
  onValueChange: handler('onValueChange').describe(
    'Called with the new on or off state.',
  ),
  disabled: z.boolean().optional().describe('Whether interaction is disabled.'),
});

export const switchProps = binaryControlProps.extend({
  accessibilityLabel: z
    .string()
    .optional()
    .describe('The spoken name; the switch draws no text.'),
});

export const sliderProps = z.object({
  value: z.number().optional().describe('The current range value.'),
  minimumValue: z.number().describe('The lowest allowed value.'),
  maximumValue: z.number().describe('The highest allowed value.'),
  step: z.number().describe('The increment between allowed values.'),
  onValueChange: handler('onValueChange').describe(
    'Called with the new range value.',
  ),
  accessibilityLabel: stringLabel.describe(
    'The spoken name of the range control.',
  ),
  valueLabel: z
    .string()
    .describe('The displayed description of the current value.'),
  disabled: z.boolean().optional().describe('Whether interaction is disabled.'),
});
