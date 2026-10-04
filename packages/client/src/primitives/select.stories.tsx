import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import {
  StorySections,
  Variation,
  Variations,
} from '../../mocks/primitive-story-variations';
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
  initialValue = undefined,
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
function SizeExamples() {
  return (
    <Variations>
      {(['default', 'sm'] as const).map((size) => (
        <Variation key={size} label={size}>
          <SelectExample size={size} />
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
          <SelectExample disabled={disabled} />
        </Variation>
      ))}
    </Variations>
  );
}
function ValueExamples() {
  return (
    <Variations>
      <Variation label="Empty">
        <SelectExample />
      </Variation>
      {fruits.map((value) => (
        <Variation key={value.value} label={value.label}>
          <SelectExample initialValue={value} />
        </Variation>
      ))}
    </Variations>
  );
}

const meta = {
  title: 'Design System/Primitives/Select',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StorySections
      sections={{
        Size: SizeExamples,
        Disabled: DisabledExamples,
        Value: ValueExamples,
      }}
    />
  ),
};
export const Size: Story = { render: SizeExamples };
export const Disabled: Story = { render: DisabledExamples };
export const Value: Story = { render: ValueExamples };
