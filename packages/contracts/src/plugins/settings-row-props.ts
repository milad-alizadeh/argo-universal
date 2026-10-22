import { z } from 'zod';
import { listStepperDefaults } from '../kit-tokens';
import { listItemProps } from './list-kit-props';
import { handler } from './plugin-part-props';
import { pickerSchema } from './selection-schemas';
import { textFieldProps } from './text-field-kit-props';

export const settingsRowProps = listItemProps.pick({
  title: true,
  subtitle: true,
  description: true,
  disabled: true,
  accessibilityLabel: true,
});

export const listLinkProps = settingsRowProps.extend({
  value: z.string().optional().describe('The current value.'),
  href: z.string().optional().describe('The destination URL.'),
  onPress: handler('onPress').optional(),
});

export const listToggleProps = settingsRowProps.extend({
  value: z.boolean().describe('Whether the switch is on.'),
  onValueChange: handler('onValueChange'),
});

export const listPickerProps = settingsRowProps.extend(
  pickerSchema.omit({ label: true, variant: true }).shape,
);

export const listStepperProps = settingsRowProps.extend({
  value: z.number().finite().describe('The current value.'),
  min: z.number().finite().optional().describe('The minimum value.'),
  max: z.number().finite().optional().describe('The maximum value.'),
  step: z
    .number()
    .positive()
    .optional()
    .meta({ default: listStepperDefaults.step })
    .describe('The increment.'),
  onValueChange: handler('onValueChange'),
});

export const listTextFieldProps = textFieldProps.extend({
  description: z.string().optional().describe('Supporting field text.'),
});

export const listButtonProps = settingsRowProps.extend({
  tone: z.enum(['accent', 'danger']).describe('The action tone.'),
  onPress: handler('onPress').optional(),
});
