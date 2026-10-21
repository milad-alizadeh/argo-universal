import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Variation, Variations as VariationList } from '../../../variations';
import { Switch } from './switch';

type CheckedExampleProps = {
  initialChecked?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
};

function CheckedExample({
  initialChecked = false,
  disabled = false,
  size,
}: CheckedExampleProps): React.JSX.Element {
  const [value, onValueChange] = useState(initialChecked);
  const switchProps = { size, value, onValueChange, disabled };

  return (
    <Switch {...switchProps} accessibilityLabel="Accept terms and conditions" />
  );
}

const examples: {
  label: string;
  props: React.ComponentProps<typeof CheckedExample>;
}[] = [
  { label: 'Off', props: {} },
  { label: 'On', props: { initialChecked: true } },
  { label: 'Small off', props: { size: 'sm' } },
  { label: 'Small on', props: { size: 'sm', initialChecked: true } },
  { label: 'Disabled', props: { disabled: true } },
];

const meta = {
  title: 'Design System/Primitives/Inputs/Switch',
  component: Switch,
  argTypes: kitArgTypes('Switch'),
  tags: ['third-party'],
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Variations: Story = {
  name: 'Switch',
  render: () => (
    <VariationList>
      {examples.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <CheckedExample {...props} />
        </Variation>
      ))}
    </VariationList>
  ),
};
