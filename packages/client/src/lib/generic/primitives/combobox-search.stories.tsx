import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { Variation, Variations } from '../variations';
import { ComboboxSearch } from './combobox-search';

function Example({ initial = '' }: { initial?: string }): React.JSX.Element {
  const [value, setValue] = useState(initial);
  return (
    <ComboboxSearch
      label="Find a Project"
      placeholder="Find a Project…"
      value={value}
      onChangeText={setValue}
    />
  );
}

const meta = {
  title: 'Design System/Primitives/ComboboxSearch',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'ComboboxSearch',
  render: () => (
    <Variations className="max-w-[300px]">
      <Variation label="Empty">
        <Example />
      </Variation>
      <Variation label="Typed">
        <Example initial="argo" />
      </Variation>
    </Variations>
  ),
};
