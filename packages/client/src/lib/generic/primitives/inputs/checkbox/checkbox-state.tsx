import {
  useFieldDescription,
  type FieldDescription,
} from '../../fields/field-description';
import type { CheckboxProps } from './checkbox-props';
export { FieldDescriptionFooter as CheckboxFooter } from '../../fields/field-description';
export type CheckboxState = FieldDescription & { toggle: () => void };

export function useCheckboxState(props: CheckboxProps): CheckboxState {
  return {
    ...useFieldDescription(props),
    toggle: (): void => toggleCheckbox(props),
  };
}

function toggleCheckbox(
  props: Pick<CheckboxProps, 'disabled' | 'value' | 'onChange' | 'onBlur'>,
): void {
  if (props.disabled) return;
  props.onChange(!props.value);
  props.onBlur?.();
}
