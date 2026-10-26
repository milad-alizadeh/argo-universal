import type { FieldTextProps } from './field-text-props';

export const secretDisabled = {
  title: 'Label',
  value: 'Value',
  placeholder: 'Placeholder',
  secure: true,
  disabled: true,
} satisfies Omit<FieldTextProps, 'onChangeText'>;

export const secretInvalid = {
  title: 'Label',
  value: 'Value',
  placeholder: 'Placeholder',
  secure: true,
  error: 'Enter a valid value.',
} satisfies Omit<FieldTextProps, 'onChangeText'>;
