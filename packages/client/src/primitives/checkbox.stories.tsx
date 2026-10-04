import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import {
  StorySections,
  Variation,
  Variations,
} from '../../mocks/primitive-story-variations';
import { Checkbox } from './checkbox';

function CheckedExample({
  initialChecked = false,
  disabled = false,
}: {
  initialChecked?: boolean;
  disabled?: boolean;
}) {
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
function CheckedExamples() {
  return (
    <Variations>
      {[false, true].map((checked) => (
        <Variation key={String(checked)} label={String(checked)}>
          <CheckedExample initialChecked={checked} />
        </Variation>
      ))}
    </Variations>
  );
}
function DisabledExamples() {
  return (
    <Variations>
      {[false, true].map((disabled) => (
        <Variation key={String(disabled)} label={String(disabled)}>
          <CheckedExample disabled={disabled} />
        </Variation>
      ))}
    </Variations>
  );
}

const meta = {
  title: 'Design System/Primitives/Checkbox',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StorySections
      sections={{ Checked: CheckedExamples, Disabled: DisabledExamples }}
    />
  ),
};
export const Checked: Story = { render: CheckedExamples };
export const Disabled: Story = { render: DisabledExamples };
