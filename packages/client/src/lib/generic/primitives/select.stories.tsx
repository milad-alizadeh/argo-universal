import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import {
  Variation,
  Variations,
} from '../../../../mocks/primitive-story-variations';
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
function SelectExample({
  size = 'default',
  disabled = false,
  initialValue,
}: {
  size?: 'default' | 'sm';
  disabled?: boolean;
  initialValue?: { value: string; label: string };
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <Select value={value} onValueChange={setValue} disabled={disabled}>
      <SelectTrigger size={size} className="w-[180px]">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent className="w-[180px]">
        <SelectGroup>
          <SelectLabel>Fruits</SelectLabel>
          {fruits.map((fruit) => (
            <SelectItem
              key={fruit.value}
              value={fruit.value}
              label={fruit.label}
            />
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

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
      <Variation label="Placeholder">
        <SelectExample />
      </Variation>
      <Variation label="Selected">
        <SelectExample initialValue={fruits[0]} />
      </Variation>
      <Variation label="Small">
        <SelectExample size="sm" />
      </Variation>
      <Variation label="Disabled">
        <SelectExample disabled />
      </Variation>
    </Variations>
  ),
};
