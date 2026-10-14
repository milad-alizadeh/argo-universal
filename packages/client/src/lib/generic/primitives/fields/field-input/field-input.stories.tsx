import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { action } from 'storybook/actions';
import { FieldGroup } from '#primitives/fields/field-group/field-group';
import { FieldSection } from '#primitives/fields/field-section/field-section';
import { FieldInput } from './field-input';

const meta = {
  title: 'Design System/Primitives/FieldInput',
  args: { label: 'Name', value: '', onChange: action('change') },
  component: FieldInput,
  parameters: { screenPreview: true },
} satisfies Meta<typeof FieldInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  render: () => <VariationsExample />,
};

function VariationsExample(): React.JSX.Element {
  return (
    <FieldGroup>
      <ProgramSection />
      <InvalidSection />
      <FieldSection title="Disabled">
        <TypedInput label="Name" initial="Example ACP" disabled />
      </FieldSection>
    </FieldGroup>
  );
}

function ProgramSection(): React.JSX.Element {
  return (
    <FieldSection
      textFields
      title="Program"
      footer="An absolute path, or a command on the Server's PATH."
    >
      <TypedInput label="Name" initial="Example ACP" />
      <ExecutableInput />
    </FieldSection>
  );
}

function ExecutableInput(): React.JSX.Element {
  return (
    <TypedInput
      mono
      label="Executable"
      initial="example-acp"
      hint="An absolute path, or a command on the Server's PATH."
    />
  );
}

function InvalidSection(): React.JSX.Element {
  return (
    <FieldSection
      textFields
      title="Invalid"
      footer="One path or command, without spaces."
      footerTone="destructive"
    >
      <InvalidExecutableInput />
    </FieldSection>
  );
}

function InvalidExecutableInput(): React.JSX.Element {
  return (
    <TypedInput
      mono
      label="Executable"
      initial="example-acp --acp"
      errors={['One path or command, without spaces.']}
    />
  );
}

type TypedInputProps = Omit<
  React.ComponentProps<typeof FieldInput>,
  'value' | 'onChange'
> & { initial: string };

function TypedInput({ initial, ...props }: TypedInputProps): React.JSX.Element {
  const [value, setValue] = useState(initial);

  return <FieldInput {...props} value={value} onChange={setValue} />;
}
