import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import {
  Variation,
  Variations,
} from '../../../../mocks/primitive-story-variations';
import { Switch } from './switch';

type CheckedExampleProps = {
  initialChecked?: boolean;
  disabled?: boolean;
  size?: 'default' | 'small';
};

function CheckedExample({
  initialChecked = false,
  disabled = false,
  size,
}: CheckedExampleProps): React.JSX.Element {
  const [checked, setChecked] = useState(initialChecked);
  const switchProps = { size, checked, onCheckedChange: setChecked, disabled };
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
  { label: 'Small off', props: { size: 'small' } },
  { label: 'Small on', props: { size: 'small', initialChecked: true } },
  { label: 'Disabled', props: { disabled: true } },
];

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
      {examples.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <CheckedExample {...props} />
        </Variation>
      ))}
    </Variations>
  ),
};
