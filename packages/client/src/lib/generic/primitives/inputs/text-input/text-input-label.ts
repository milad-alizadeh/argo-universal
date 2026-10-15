import type { StandaloneTextInputProps } from './text-input-props';

export const requiredLabel = (
  props: Pick<StandaloneTextInputProps, 'label' | 'required'>,
): string => (props.required ? `${props.label} *` : props.label);
