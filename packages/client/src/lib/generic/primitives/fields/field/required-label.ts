// A required field's label carries the asterisk on every platform.
export const requiredLabel = (props: {
  label: string;
  required?: boolean;
}): string => (props.required ? `${props.label} *` : props.label);
