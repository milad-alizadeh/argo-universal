import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { Variation, Variations } from '../variations';
import { SegmentedControl } from './segmented-control';

const choices = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;
type Appearance = (typeof choices)[number]['value'];

function Example({
  disabled = false,
}: {
  disabled?: boolean;
}): React.JSX.Element {
  const [value, setValue] = useState<Appearance>('system');
  const props = {
    accessibilityLabel: 'Theme',
    choices,
    value,
    onValueChange: setValue,
    disabled,
  };
  return <SegmentedControl {...props} />;
}

const meta = {
  title: 'Design System/Primitives/SegmentedControl',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'SegmentedControl',
  render: () => (
    <Variations>
      <Variation label="Default">
        <Example />
      </Variation>
      <Variation label="Disabled">
        <Example disabled />
      </Variation>
    </Variations>
  ),
};
