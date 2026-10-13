import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ComponentProps, type ReactElement } from 'react';
import { Variation, Variations as Examples } from '../../../variations';
import { StandaloneFieldInput } from './standalone-field-input';

const meta = {
  title: 'Design System/Primitives/StandaloneFieldInput',
} satisfies Meta;
export default meta;

export const Variations: StoryObj<typeof meta> = {
  name: 'StandaloneFieldInput',
  render: (): ReactElement => (
    <Examples>
      <Variation label="Required">
        <EditableField
          label="Title"
          initial="Drafts vanish after a reconnect"
          required
        />
      </Variation>
      <Variation label="Invalid">
        <EditableField
          label="Estimate"
          initial="12"
          numeric
          errors={['Enter a whole number from 1 to 8.']}
        />
      </Variation>
      <Variation label="Disabled">
        <EditableField
          label="Title"
          initial="Drafts vanish after a reconnect"
          disabled
        />
      </Variation>
    </Examples>
  ),
};

function EditableField({
  initial,
  ...props
}: Omit<ComponentProps<typeof StandaloneFieldInput>, 'value' | 'onChange'> & {
  initial: string;
}): ReactElement {
  const [value, setValue] = useState(initial);
  return <StandaloneFieldInput {...props} value={value} onChange={setValue} />;
}
