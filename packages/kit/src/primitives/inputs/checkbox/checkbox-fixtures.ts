import type { CheckboxProps } from './checkbox-props';

type CheckboxFixture = Omit<CheckboxProps, 'onValueChange'>;

const label = 'Notify team';

export const uncheckedCheckbox = {
  label,
  value: false,
} satisfies CheckboxFixture;

export const checkedCheckbox = { label, value: true } satisfies CheckboxFixture;

export const disabledCheckbox = {
  label,
  value: true,
  disabled: true,
} satisfies CheckboxFixture;

export const invalidCheckbox = {
  label,
  value: false,
  invalid: true,
} satisfies CheckboxFixture;
