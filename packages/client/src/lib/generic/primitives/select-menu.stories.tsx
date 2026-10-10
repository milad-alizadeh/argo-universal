import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import {
  Variation,
  Variations,
} from '../../../../mocks/primitive-story-variations';
import { SelectMenu } from './select-menu';

const efforts = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;

type Effort = (typeof efforts)[number]['value'];

function SelectMenuExample({
  initialValue,
  disabled = false,
  invalid = false,
}: {
  initialValue?: Effort;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <SelectMenu
      accessibilityLabel="Effort"
      value={value}
      options={efforts}
      onValueChange={setValue}
      disabled={disabled}
      invalid={invalid}
    />
  );
}

const meta = {
  title: 'Design System/Primitives/SelectMenu',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'SelectMenu',
  render: () => (
    <Variations>
      <Variation label="Placeholder">
        <SelectMenuExample />
      </Variation>
      <Variation label="Selected">
        <SelectMenuExample initialValue="medium" />
      </Variation>
      <Variation label="Invalid">
        <SelectMenuExample invalid />
      </Variation>
      <Variation label="Disabled">
        <SelectMenuExample initialValue="medium" disabled />
      </Variation>
    </Variations>
  ),
};
