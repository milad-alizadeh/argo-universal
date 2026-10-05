import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { Switch } from './switch';

function CheckedExample({
  initialChecked = false,
  disabled = false,
}: {
  initialChecked?: boolean;
  disabled?: boolean;
}) {
  const [checked, setChecked] = useState(initialChecked);
  return (
    <Switch
      checked={checked}
      onCheckedChange={setChecked}
      disabled={disabled}
      accessibilityLabel="Accept terms and conditions"
    />
  );
}

const meta = {
  title: 'Design System/Primitives/Switch',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Switch',
  render: () => (
    <Variations>
      <Variation label="Off">
        <CheckedExample />
      </Variation>
      <Variation label="On">
        <CheckedExample initialChecked />
      </Variation>
      <Variation label="Disabled">
        <CheckedExample disabled />
      </Variation>
    </Variations>
  ),
};
