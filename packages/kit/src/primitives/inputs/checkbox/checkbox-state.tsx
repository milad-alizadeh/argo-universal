import {
  useFieldDescription,
  type FieldDescription,
} from '#primitives/fields/field-description';
import type { CheckboxProps } from './checkbox-props';

export { FieldDescriptionFooter as CheckboxFooter } from '#primitives/fields/field-description';

export type CheckboxState = FieldDescription & { toggle: () => void };

export function useCheckboxState(props: CheckboxProps): CheckboxState {
  return {
    ...useFieldDescription(props),
    toggle: (): void => toggleCheckbox(props),
  };
}

function toggleCheckbox(
  props: Pick<CheckboxProps, 'disabled' | 'value' | 'onValueChange' | 'onBlur'>,
): void {
  if (props.disabled) return;
  props.onValueChange(!props.value);
  props.onBlur?.();
}
