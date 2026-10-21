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
