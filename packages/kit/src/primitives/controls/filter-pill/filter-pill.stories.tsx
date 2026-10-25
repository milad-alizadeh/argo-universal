import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { FilterPill } from './filter-pill';
import { filtersFilterPill } from './filter-pill-fixtures';

// A pill is one of a toolbar row that keeps the chosen filter, so the row owns the selection.
function Pills(): React.JSX.Element {
  const [selected, setSelected] = useState<string>('all');

  return (
    <View className="flex-row items-center gap-1">
      {filtersFilterPill.map(({ value, ...pill }) => (
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

const meta = {
  title: 'Design System/Primitives/Controls/FilterPill',
  component: FilterPill,
  args: { label: 'All', selected: true, onPress: (): void => {} },
  argTypes: kitArgTypes('FilterPill'),
} satisfies Meta<typeof FilterPill>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Filters: Story = {
  render: (): React.JSX.Element => <Pills />,
};
