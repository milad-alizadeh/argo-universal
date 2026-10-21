import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { Variation, Variations as VariationList } from '../../../variations';
import { SegmentedControl } from './segmented-control';

const options = [
  { value: 'pr', label: 'PR' },
  { value: 'files', label: 'File changes' },
];

function Example(): React.JSX.Element {
  const [value, onValueChange] = useState('files');

  return (
    <SegmentedControl label="Git" {...{ options, value, onValueChange }} />
  );
}

const meta = {
  title: 'Design System/Primitives/Inputs/SegmentedControl',
  component: SegmentedControl,
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Variations: Story = {
  name: 'SegmentedControl',
  render: () => (
    <VariationList>
      <Variation label="Git panels">
        <Example />
      </Variation>
    </VariationList>
  ),
};
