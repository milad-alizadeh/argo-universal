import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { Variation, Variations } from '../../../storybook/variations';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './select';

const fruits = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'blueberry', label: 'Blueberry' },
];
type SelectExampleProps = {
  size?: 'default' | 'sm';
  disabled?: boolean;
  initialValue?: { value: string; label: string };
};

function SelectExample({
  size = 'default',
  disabled = false,
  initialValue,
}: SelectExampleProps): React.JSX.Element {
  const [value, setValue] = useState(initialValue);
  return (
    <Select value={value} onValueChange={setValue} disabled={disabled}>
      <SelectTrigger size={size} className="w-[180px]">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <FruitOptions />
    </Select>
  );
}

const examples: {
  label: string;
  props: React.ComponentProps<typeof SelectExample>;
}[] = [
  { label: 'Placeholder', props: {} },
  { label: 'Selected', props: { initialValue: fruits[0] } },
  { label: 'Small', props: { size: 'sm' } },
  { label: 'Disabled', props: { disabled: true } },
];

const meta = {
  title: 'Design System/Primitives/Select',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Select',
  render: () => (
    <Variations>
      {examples.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <SelectExample {...props} />
        </Variation>
      ))}
    </Variations>
  ),
};

function FruitOptions(): React.JSX.Element {
  return (
    <SelectContent className="w-[180px]">
      <SelectGroup>
        <SelectLabel>Fruits</SelectLabel>
        {fruits.map((fruit) => (
          <SelectItem key={fruit.value} {...fruit} />
        ))}
      </SelectGroup>
    </SelectContent>
  );
}
