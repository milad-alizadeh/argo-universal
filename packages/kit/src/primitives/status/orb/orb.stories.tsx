import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { Orb } from './orb';
import { OrbContinuity } from './orb-continuity';
import type { OrbProps, OrbState } from './orb-props';

const meta = {
  title: 'Design System/Primitives/Status/Orb',
  component: Orb,
  // App-only for now, so no Contracts schema to read the prop domain from.
  argTypes: {
    state: {
      control: 'select',
      options: [
        'working',
        'searching',
        'solving',
        'listening',
        'composing',
        'shaping',
      ],
    },
    size: { control: 'select', options: ['sm', 'md'] },
    paused: { control: 'boolean' },
    continues: { control: 'boolean' },
    accessibilityLabel: { control: 'text' },
  },
  args: { state: 'working', size: 'md' },
} satisfies Meta<typeof Orb>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Working: Story = {};

export const Searching: Story = { args: { state: 'searching' } };

export const Solving: Story = { args: { state: 'solving' } };

export const Listening: Story = { args: { state: 'listening' } };

export const Composing: Story = { args: { state: 'composing' } };

export const Shaping: Story = { args: { state: 'shaping' } };

export const Inline: Story = { args: { size: 'sm' } };

export const Paused: Story = { args: { paused: true } };

const everyState: OrbState[] = [
  'working',
  'searching',
  'solving',
  'composing',
  'shaping',
  'listening',
];

const msPerState = 1500;

// A new orb for each state, as a Feed row's orb gives way to the next row's: the one drawing carries on and morphs between them.
function OrbAfterOrb(props: OrbProps): React.JSX.Element {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((shown) => shown + 1), msPerState);

    return (): void => clearInterval(timer);
  }, []);

  return (
    <OrbContinuity>
      <Orb
        key={step}
        {...props}
        state={everyState[step % everyState.length]}
        continues
      />
    </OrbContinuity>
  );
}

export const Morphing: Story = {
  render: (args) => <OrbAfterOrb {...args} />,
};
