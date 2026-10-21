import type { TextareaProps } from './textarea-props';

const placeholder = 'Message';

export const emptyTextarea = { placeholder } satisfies TextareaProps;

export const filledTextarea = {
  placeholder,
  defaultValue: 'Hello.',
} satisfies TextareaProps;

export const readOnlyTextarea = {
  placeholder,
  disabled: true,
} satisfies TextareaProps;

// React Native declares no invalid attribute, so the box reads the web one, outside the props type.
export const invalidTextarea = {
  'aria-invalid': true,
} satisfies TextareaProps & { 'aria-invalid'?: boolean };
