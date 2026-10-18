import { z } from 'zod';
import { part, stringLabel, onPress } from './plugin-part-schema-utils';
import { iconButtonProps } from './presentation-kit-props';

export const iconButtonPart = part('An icon-only button.', iconButtonProps, {
  events: { onPress: z.undefined() },
  label: 'The required `accessibilityLabel` is the button name.',
  previous: [
    z.object({
      icon: z.string().describe('Native symbol name.'),
      accessibilityLabel: stringLabel,
      disabled: z.boolean().optional(),
      onPress: onPress.optional(),
    }),
  ],
});
