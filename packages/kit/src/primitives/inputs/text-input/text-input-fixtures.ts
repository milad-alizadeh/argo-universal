import type {
  BareTextInputProps,
  RowTextInputProps,
  StandaloneTextInputProps,
} from './text-input-props';

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

type Typed<Props> = Omit<Props, 'value' | 'onChangeText' | 'variant'> & {
  initial: string;
};

type RowTextInputFixture = Typed<RowTextInputProps>;

type StandaloneTextInputFixture = Typed<StandaloneTextInputProps>;

export const pathHint = "An absolute path, or a command on the Server's PATH.";

export const spaceError = 'One path or command, without spaces.';

const title = 'Drafts vanish after a reconnect';

export const nameRowTextInput = {
  label: 'Name',
  initial: 'Example ACP',
} satisfies RowTextInputFixture;

export const executableRowTextInput = {
  mono: true,
  label: 'Executable',
  initial: 'example-acp',
  hint: pathHint,
} satisfies RowTextInputFixture;

export const rowInvalidTextInput = {
  mono: true,
  label: 'Executable',
  initial: 'example-acp --acp',
  errors: [spaceError],
} satisfies RowTextInputFixture;

export const rowDisabledTextInput = {
  label: 'Name',
  initial: 'Example ACP',
  disabled: true,
} satisfies RowTextInputFixture;

export const rowCheckingTextInput = {
  mono: true,
  label: 'Executable',
  initial: 'example-acp',
  loading: true,
} satisfies RowTextInputFixture;

export const requiredTextInput = {
  label: 'Title',
  initial: title,
  required: true,
} satisfies StandaloneTextInputFixture;

export const invalidTextInput = {
  numeric: true,
  label: 'Estimate',
  initial: '12',
  errors: ['Enter a whole number from 1 to 8.'],
} satisfies StandaloneTextInputFixture;

export const disabledTextInput = {
  label: 'Title',
  initial: title,
  disabled: true,
} satisfies StandaloneTextInputFixture;

export const checkingTextInput = {
  label: 'Folder',
  initial: '~/Code',
  loading: true,
} satisfies StandaloneTextInputFixture;
