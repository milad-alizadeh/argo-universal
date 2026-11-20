import { z } from 'zod';
import { colourStops } from '../colour-data';
import { handler, stringLabel } from '../kit-component-props';

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
  fill: colourStops
    .optional()
    .describe(
      'The filled part of the track in colours that are data, such as a light’s: a gradient on the web, the first colour on iOS and Android.',
    ),
});

export const switchProps = z.object({
  value: z.boolean().describe('Whether the switch is on.'),
  onValueChange: handler('onValueChange').describe(
    'Called with the new on or off value.',
  ),
  accessibilityLabel: stringLabel.describe('The spoken name of the switch.'),
  disabled: z.boolean().optional().describe('Whether interaction is disabled.'),
});
