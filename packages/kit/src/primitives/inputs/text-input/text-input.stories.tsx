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

const pathHint = "An absolute path, or a command on the Server's PATH.";

const spaceError = 'One path or command, without spaces.';

const title = 'Drafts vanish after a reconnect';

export const Row: Story = {
  render: (): React.JSX.Element => (
    <RowFrame footer={pathHint}>
      <TypedRow label="Name" initial="Example ACP" />
      <TypedRow mono label="Executable" initial="example-acp" hint={pathHint} />
    </RowFrame>
  ),
};

export const RowInvalid: Story = {
  render: (): React.JSX.Element => (
    <RowFrame footer={spaceError} tone="danger">
      <TypedRow
        mono
        label="Executable"
        initial="example-acp --acp"
        errors={[spaceError]}
      />
    </RowFrame>
  ),
};

export const RowDisabled: Story = {
  render: (): React.JSX.Element => (
    <RowFrame>
      <TypedRow label="Name" initial="Example ACP" disabled />
    </RowFrame>
  ),
};

export const RowChecking: Story = {
  render: (): React.JSX.Element => (
    <RowFrame>
      <TypedRow mono label="Executable" initial="example-acp" loading />
    </RowFrame>
  ),
};

export const Required: Story = {
  render: (): React.JSX.Element => (
    <TypedStandalone label="Title" initial={title} required />
  ),
};

export const Invalid: Story = {
  render: (): React.JSX.Element => (
    <TypedStandalone
      numeric
      label="Estimate"
      initial="12"
      errors={['Enter a whole number from 1 to 8.']}
    />
  ),
};

export const Disabled: Story = {
  render: (): React.JSX.Element => (
    <TypedStandalone label="Title" initial={title} disabled />
  ),
};

export const Checking: Story = {
  render: (): React.JSX.Element => (
    <TypedStandalone label="Folder" initial="~/Code" loading />
  ),
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
