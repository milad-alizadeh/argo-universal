import type { CheckboxProps } from './checkbox-props';

export type CheckboxState = { toggle: () => void };

export function checkboxState(props: CheckboxProps): CheckboxState {
  return { toggle: (): void => toggleCheckbox(props) };
}

function toggleCheckbox(
  props: Pick<CheckboxProps, 'disabled' | 'value' | 'onValueChange' | 'onBlur'>,
): void {
  if (props.disabled) return;
  props.onValueChange(!props.value);
  props.onBlur?.();
}
