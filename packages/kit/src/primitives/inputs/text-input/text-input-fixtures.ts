import type { BareTextInputProps } from './text-input-props';

type BareTextInputFixture = Omit<BareTextInputProps, 'ref'>;

export const bareEmptyTextInput = {
  variant: 'bare',
  placeholder: 'Email',
  accessibilityLabel: 'Bare empty',
} satisfies BareTextInputFixture;

export const bareFilledTextInput = {
  variant: 'bare',
  defaultValue: 'hello@example.com',
  placeholder: 'Email',
  accessibilityLabel: 'Bare filled',
} satisfies BareTextInputFixture;

export const bareReadOnlyTextInput = {
  variant: 'bare',
  editable: false,
  placeholder: 'Email',
  accessibilityLabel: 'Bare read-only',
} satisfies BareTextInputFixture;

export const bareInvalidTextInput = {
  variant: 'bare',
  'aria-invalid': true,
  accessibilityLabel: 'Bare invalid',
} satisfies BareTextInputFixture;

export const bareMutedTextInput = {
  variant: 'bare',
  tone: 'muted',
  placeholder: 'https://',
  accessibilityLabel: 'Bare muted',
} satisfies BareTextInputFixture;

export const bareSecureTextInput = {
  variant: 'bare',
  secureTextEntry: true,
  defaultValue: 'password',
  accessibilityLabel: 'Bare secure',
} satisfies BareTextInputFixture;
