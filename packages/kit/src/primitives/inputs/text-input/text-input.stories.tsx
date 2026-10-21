import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { List, ListSection } from '#primitives/lists/list';
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
  executableRowTextInput,
  invalidTextInput,
  nameRowTextInput,
  pathHint,
  requiredTextInput,
  rowCheckingTextInput,
  rowDisabledTextInput,
  rowInvalidTextInput,
  spaceError,
} from './text-input-fixtures';
import type {
  RowTextInputProps,
  StandaloneTextInputProps,
} from './text-input-props';

const meta = {
  title: 'Design System/Primitives/Inputs/TextInput',
  component: TextInput,
  // The bare box is the one variant a story draws from args; the labelled ones hold their own value.
  args: bareEmptyTextInput,
  argTypes: kitArgTypes('TextInput'),
  parameters: { screenPreview: true },
} satisfies Meta<typeof TextInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Row: Story = {
  render: (): React.JSX.Element => (
    <RowFrame footer={pathHint}>
      <TypedRow {...nameRowTextInput} />
      <TypedRow {...executableRowTextInput} />
    </RowFrame>
  ),
};

export const RowInvalid: Story = {
  render: (): React.JSX.Element => (
    <RowFrame footer={spaceError} tone="danger">
      <TypedRow {...rowInvalidTextInput} />
    </RowFrame>
  ),
};

export const RowDisabled: Story = {
  render: (): React.JSX.Element => (
    <RowFrame>
      <TypedRow {...rowDisabledTextInput} />
    </RowFrame>
  ),
};

export const RowChecking: Story = {
  render: (): React.JSX.Element => (
    <RowFrame>
      <TypedRow {...rowCheckingTextInput} />
    </RowFrame>
  ),
};

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

// A row draws inside a grouped List section, where its label leads and its footer closes the section.
function RowFrame(props: {
  footer?: string;
  tone?: 'danger';
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <List appearance="grouped">
      <ListSection footer={props.footer} tone={props.tone}>
        {props.children}
      </ListSection>
    </List>
  );
}

type Typed<Props> = Omit<Props, 'value' | 'onChangeText' | 'variant'> & {
  initial: string;
};

function TypedRow({
  initial,
  ...props
}: Typed<RowTextInputProps>): React.JSX.Element {
  const [value, setValue] = useState(initial);

  return (
    <TextInput {...props} variant="row" value={value} onChangeText={setValue} />
  );
}

function TypedStandalone({
  initial,
  ...props
}: Typed<StandaloneTextInputProps>): React.JSX.Element {
  const [value, setValue] = useState(initial);

  return <TextInput {...props} value={value} onChangeText={setValue} />;
}
