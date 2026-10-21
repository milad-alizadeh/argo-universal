import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Slider, type SliderProps } from './slider';

const speeds = { minimumValue: 0.5, maximumValue: 2, step: 0.5 };

const efforts = { minimumValue: 0, maximumValue: 5, step: 1 };

// The value is held by the caller, so each state drags against local state and its label follows.
function ControlledSlider(props: SliderProps): React.JSX.Element {
  const [value, setValue] = useState(props.value);

  const onValueChange = (next: number): void => {
    setValue(next);
    props.onValueChange(next);
  };

  return (
    <Slider
      {...props}
      value={value}
      valueLabel={valueLabel(value, props.valueLabel)}
      onValueChange={onValueChange}
    />
  );
}

const valueLabel = (value: number | undefined, none: string): string =>
  value === undefined ? none : `${value.toFixed(1)}×`;

const meta = {
  title: 'Design System/Primitives/Inputs/Slider',
  component: Slider,
  args: {
    ...speeds,
    accessibilityLabel: 'Speech speed',
    valueLabel: 'None',
    onValueChange: fn(),
  },
  argTypes: kitArgTypes('Slider'),
  // The track takes the width a settings row gives it.
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-80">
        <Story />
      </View>
    ),
  ],
  render: (args): React.JSX.Element => <ControlledSlider {...args} />,
} satisfies Meta<typeof Slider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { value: 1 } };

export const Minimum: Story = { args: { value: 0.5 } };

export const Maximum: Story = { args: { value: 2 } };

export const SixStops: Story = { args: { ...efforts, value: 2 } };

export const NoSelection: Story = { args: efforts };

export const Disabled: Story = { args: { value: 1, disabled: true } };
