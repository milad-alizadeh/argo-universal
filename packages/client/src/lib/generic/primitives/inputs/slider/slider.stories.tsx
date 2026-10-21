import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#lib/generic/kit-arg-types';
import { Variation, Variations as VariationList } from '../../../variations';
import { Slider, type SliderProps } from './slider';

type ExampleProps = Pick<
  SliderProps,
  'minimumValue' | 'maximumValue' | 'step' | 'disabled'
> & { initialValue?: number };

const speeds = { minimumValue: 0.5, maximumValue: 2, step: 0.5 };

const efforts = { minimumValue: 0, maximumValue: 5, step: 1 };

function SliderExample(props: ExampleProps): React.JSX.Element {
  const { initialValue, ...range } = props;
  const [value, setValue] = useState(initialValue);

  return (
    <View className="w-80">
      <Slider
        {...range}
        {...speechLabels(value)}
        value={value}
        onValueChange={setValue}
      />
    </View>
  );
}

function speechLabels(
  value: number | undefined,
): Pick<SliderProps, 'accessibilityLabel' | 'valueLabel'> {
  return {
    accessibilityLabel: 'Speech speed',
    valueLabel: value === undefined ? 'None' : `${value.toFixed(1)}×`,
  };
}

const examples: { label: string; props: ExampleProps }[] = [
  { label: 'Default', props: { ...speeds, initialValue: 1 } },
  { label: 'Minimum', props: { ...speeds, initialValue: 0.5 } },
  { label: 'Maximum', props: { ...speeds, initialValue: 2 } },
  { label: 'Six stops', props: { ...efforts, initialValue: 2 } },
  { label: 'No selection', props: { ...efforts } },
  { label: 'Disabled', props: { ...speeds, initialValue: 1, disabled: true } },
];

const meta = {
  title: 'Design System/Primitives/Inputs/Slider',
  component: Slider,
  argTypes: kitArgTypes('Slider'),
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Variations: Story = {
  name: 'Slider',
  render: () => (
    <VariationList>
      {examples.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <SliderExample {...props} />
        </Variation>
      ))}
    </VariationList>
  ),
};
