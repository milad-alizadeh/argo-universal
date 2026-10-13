import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { Variation, Variations as VariationList } from '../../../variations';
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
  variant?: 'default' | 'plain';
};

const triggerWidth = { default: 'w-[180px]', plain: undefined };

function SelectExample({
  size,
  disabled = false,
  initialValue,
  variant,
}: SelectExampleProps): React.JSX.Element {
  const [value, setValue] = useState(initialValue);
  return (
    <Select value={value} onValueChange={setValue} disabled={disabled}>
      <FruitTrigger size={size} variant={variant} />
      <FruitOptions />
    </Select>
  );
}

function FruitTrigger({
  size,
  variant,
}: Pick<SelectExampleProps, 'size' | 'variant'>): React.JSX.Element {
  return (
    <SelectTrigger
      size={size}
      variant={variant}
      className={triggerWidth[variant ?? 'default']}
    >
      <SelectValue placeholder="Select a fruit" />
    </SelectTrigger>
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
  { label: 'Plain', props: { initialValue: fruits[0], variant: 'plain' } },
];

const meta = {
  title: 'Design System/Primitives/Select',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'Select',
  render: () => (
    <VariationList>
      {examples.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <SelectExample {...props} />
        </Variation>
      ))}
    </VariationList>
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
