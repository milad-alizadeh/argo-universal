import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { Variation, Variations } from '../variations';
import { FilterPill } from './filter-pill';

const pills = [
  { value: 'all', label: 'All' },
  { value: 'installed', label: 'Installed', count: 4 },
  { value: 'not-installed', label: 'Not installed', count: 2 },
] as const;

function Pills(): React.JSX.Element {
  const [selected, setSelected] = useState<string>('all');
  return (
    <View className="flex-row items-center gap-1">
      {pills.map(({ value, ...pill }) => (
        <FilterPill
          key={value}
          {...pill}
          selected={selected === value}
          onPress={() => setSelected(value)}
        />
      ))}
    </View>
  );
}

const meta = { title: 'Design System/Primitives/FilterPill' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'FilterPill',
  render: () => (
    <Variations>
      <Variation label="Filters">
        <Pills />
      </Variation>
    </Variations>
  ),
};
