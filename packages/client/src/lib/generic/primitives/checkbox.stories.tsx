import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import {
  Variation,
  Variations,
} from '../../../../mocks/primitive-story-variations';
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

export const Overview: Story = {
  name: 'Checkbox',
  render: () => (
    <Variations>
      <Variation label="Unchecked">
        <CheckedExample />
      </Variation>
      <Variation label="Checked">
        <CheckedExample initialChecked />
      </Variation>
      <Variation label="Disabled">
        <CheckedExample disabled />
      </Variation>
    </Variations>
  ),
};
