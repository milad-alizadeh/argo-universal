import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { TextInput } from './text-input';
import {
  bareEmptyTextInput,
  bareFilledTextInput,
  bareInvalidTextInput,
  bareMutedTextInput,
  bareReadOnlyTextInput,
  bareSecureTextInput,
  checkingTextInput,
  disabledTextInput,
  invalidTextInput,
  requiredTextInput,
} from './text-input-fixtures';
import type { StandaloneTextInputProps } from './text-input-props';

const meta = {
  title: 'Design System/Primitives/Inputs/TextInput',
  component: TextInput,
  // The bare box is the one variant a story draws from args; the labelled ones hold their own value.
  args: { variant: 'bare' },
  argTypes: kitArgTypes('TextInput'),
  parameters: { screenPreview: true },
} satisfies Meta<typeof TextInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Required: Story = {
  render: (): React.JSX.Element => <TypedStandalone {...requiredTextInput} />,
};

export const Invalid: Story = {
  render: (): React.JSX.Element => <TypedStandalone {...invalidTextInput} />,
};

export const Disabled: Story = {
  render: (): React.JSX.Element => <TypedStandalone {...disabledTextInput} />,
};

export const Checking: Story = {
  render: (): React.JSX.Element => <TypedStandalone {...checkingTextInput} />,
};

export const BareEmpty: Story = { args: bareEmptyTextInput };

export const BareFilled: Story = { args: bareFilledTextInput };

export const BareReadOnly: Story = { args: bareReadOnlyTextInput };

export const BareInvalid: Story = { args: bareInvalidTextInput };

export const BareMuted: Story = { args: bareMutedTextInput };

export const BareSecure: Story = { args: bareSecureTextInput };

type Typed<Props> = Omit<Props, 'value' | 'onChangeText' | 'variant'> & {
  initial: string;
};

function TypedStandalone({
  initial,
  ...props
}: Typed<StandaloneTextInputProps>): React.JSX.Element {
  const [value, setValue] = useState(initial);

  return <TextInput {...props} value={value} onChangeText={setValue} />;
}
