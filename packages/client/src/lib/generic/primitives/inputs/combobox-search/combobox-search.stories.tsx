import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Variation, Variations as VariationList } from '../../../variations';
import { Text } from '../../display/text/text';
import { ComboboxSearch } from './combobox-search';

const projects = ['argo-universal', 'argo-server', 'example-app'];

// The search sits on the surface that holds the results: a popover on a wide window, a sheet on a narrow one.
function Example({ initial = '' }: { initial?: string }): React.JSX.Element {
  const [value, setValue] = useState(initial);
  const matches = projects.filter((project) => project.includes(value));
  return (
    <View className="gap-2 rounded-2xl bg-popover p-4 wide:gap-1 wide:border wide:border-border wide:p-1 wide:shadow-card">
      <ComboboxSearch
        label="Find a Project"
        placeholder="Find a Project…"
        value={value}
        onChangeText={setValue}
      />
      <MatchList matches={matches} />
    </View>
  );
}

function MatchList({ matches }: { matches: string[] }): React.JSX.Element {
  return (
    <>
      {matches.map((project) => (
        <Text key={project} className="px-4 py-2 wide:px-2 wide:py-1.5">
          {project}
        </Text>
      ))}
    </>
  );
}

const meta = {
  title: 'Design System/Primitives/ComboboxSearch',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'ComboboxSearch',
  render: () => (
    <VariationList className="max-w-[300px]">
      <Variation label="Empty">
        <Example />
      </Variation>
      <Variation label="Typed">
        <Example initial="argo" />
      </Variation>
    </VariationList>
  ),
};
