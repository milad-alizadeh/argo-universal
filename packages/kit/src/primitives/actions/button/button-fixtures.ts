import type { ButtonProps } from './button-props';

const label = 'Save changes';

export const defaultButton = { label } satisfies ButtonProps;

export const secondaryButton = {
  label,
  variant: 'secondary',
} satisfies ButtonProps;

export const outlinedButton = {
  label,
  variant: 'outline',
} satisfies ButtonProps;

export const textButton = { label, variant: 'ghost' } satisfies ButtonProps;

export const linkButton = {
  label: 'Learn more',
  variant: 'link',
} satisfies ButtonProps;

export const destructiveButton = {
  label: 'Delete',
  tone: 'danger',
  fullWidth: true,
} satisfies ButtonProps;

export const extraSmallButton = { label, size: 'xs' } satisfies ButtonProps;

export const smallButton = { label, size: 'sm' } satisfies ButtonProps;

export const fullWidthOnAPhoneButton = {
  label: 'Add argument',
  variant: 'ghost',
  size: 'sm',
  icon: 'add',
  fullWidth: 'narrow',
} satisfies ButtonProps;

export const largeButton = { label, size: 'lg' } satisfies ButtonProps;

export const disabledButton = { label, disabled: true } satisfies ButtonProps;

export const loadingButton = { label, loading: true } satisfies ButtonProps;

export const leadingIconButton = {
  label: 'Add',
  icon: 'agent',
} satisfies ButtonProps;
