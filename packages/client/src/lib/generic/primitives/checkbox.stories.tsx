import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { Variation, Variations as VariationList } from '../variations';
import { Checkbox } from './checkbox';

type CheckedExampleProps = {
  initialChecked?: boolean;
  disabled?: boolean;
};

function CheckedExample({
  initialChecked = false,
  disabled = false,
}: CheckedExampleProps): React.JSX.Element {
  const [checked, setChecked] = useState(initialChecked);
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={setChecked}
      disabled={disabled}
      accessibilityLabel="Accept terms and conditions"
    />
  );
}

const meta = {
  title: 'Design System/Primitives/Checkbox',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'Checkbox',
  render: () => (
    <VariationList>
      <Variation label="Unchecked">
        <CheckedExample />
      </Variation>
      <Variation label="Checked">
        <CheckedExample initialChecked />
      </Variation>
      <Variation label="Disabled">
        <CheckedExample disabled />
      </Variation>
    </VariationList>
  ),
};
