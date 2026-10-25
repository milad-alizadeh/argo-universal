import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Slider, type SliderProps } from './slider';
import {
  defaultSlider,
  disabledSlider,
  maximumSlider,
  minimumSlider,
  noSelectionSlider,
  sixStopsSlider,
} from './slider-fixtures';

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
  title: 'Design System/Primitives/Controls/Slider',
  component: Slider,
  args: { onValueChange: fn() },
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

export const Default: Story = { args: defaultSlider };

export const Minimum: Story = { args: minimumSlider };

export const Maximum: Story = { args: maximumSlider };

export const SixStops: Story = { args: sixStopsSlider };

export const NoSelection: Story = { args: noSelectionSlider };

export const Disabled: Story = { args: disabledSlider };
