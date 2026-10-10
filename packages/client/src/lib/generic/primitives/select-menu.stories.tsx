import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { Variation, Variations } from '../variations';
import { SelectMenu } from './select-menu';

const efforts = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;

type Effort = (typeof efforts)[number]['value'];

type SelectMenuExampleProps = {
  initialValue?: Effort;
  disabled?: boolean;
  invalid?: boolean;
};

function SelectMenuExample({
  initialValue,
  disabled = false,
  invalid = false,
}: SelectMenuExampleProps): React.JSX.Element {
  const [value, setValue] = useState(initialValue);
  const menuProps = {
    value,
    options: efforts,
    onValueChange: setValue,
    disabled,
    invalid,
  };
  return <SelectMenu accessibilityLabel="Effort" {...menuProps} />;
}

const examples: {
  label: string;
  props: React.ComponentProps<typeof SelectMenuExample>;
}[] = [
  { label: 'Placeholder', props: {} },
  { label: 'Selected', props: { initialValue: 'medium' } },
  { label: 'Invalid', props: { invalid: true } },
  { label: 'Disabled', props: { initialValue: 'medium', disabled: true } },
];

const meta = {
  title: 'Design System/Primitives/SelectMenu',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'SelectMenu',
  render: () => (
    <Variations>
      {examples.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <SelectMenuExample {...props} />
        </Variation>
      ))}
    </Variations>
  ),
};
