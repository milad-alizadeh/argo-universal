import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { action } from 'storybook/actions';
import { FieldGroup } from '../field-group/field-group';
import { FieldSection } from '../field-section/field-section';
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
  render: () => (
    <FieldGroup>
      <FieldSection
        textFields
        title="Program"
        footer="An absolute path, or a command on the Server's PATH."
      >
        <TypedInput label="Name" initial="Example ACP" />
        <TypedInput
          mono
          label="Executable"
          initial="example-acp"
          hint="An absolute path, or a command on the Server's PATH."
        />
      </FieldSection>
      <FieldSection
        textFields
        title="Invalid"
        footer="One path or command, without spaces."
        footerTone="destructive"
      >
        <TypedInput
          mono
          label="Executable"
          initial="example-acp --acp"
          errors={['One path or command, without spaces.']}
        />
      </FieldSection>
      <FieldSection title="Disabled">
        <TypedInput label="Name" initial="Example ACP" disabled />
      </FieldSection>
    </FieldGroup>
  ),
};

type TypedInputProps = Omit<
  React.ComponentProps<typeof FieldInput>,
  'value' | 'onChange'
> & { initial: string };

function TypedInput({ initial, ...props }: TypedInputProps): React.JSX.Element {
  const [value, setValue] = useState(initial);
  return <FieldInput {...props} value={value} onChange={setValue} />;
}
