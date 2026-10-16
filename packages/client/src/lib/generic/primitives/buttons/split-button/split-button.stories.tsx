import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { Variation, Variations as VariationList } from '../../../variations';
import { SplitButton } from './split-button';

const meta = { title: 'Design System/Primitives/SplitButton' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Scope = 'once' | 'always';

const scopes = [
  { value: 'once', label: 'Allow once' },
  { value: 'always', label: 'Always allow' },
] as const;

const mergeSplit = {
  size: 'xs',
  primary: true,
  label: 'Merge PR',
  icon: 'merged',
  menuLabel: 'Merge options',
  actions: [
    { label: 'Squash and merge', onPress: fn() },
    { label: 'Create a merge commit', onPress: fn() },
    { label: 'Rebase and merge', onPress: fn() },
  ],
} as const;

function ScopeSplit(props: { narrow?: boolean }): React.JSX.Element {
  const [scope, setScope] = useState<Scope>('once');

  return (
    <SplitButton
      primary
      fullWidth={props.narrow}
      menuLabel="Allow options"
      options={scopes}
      value={scope}
      onValueChange={setScope}
      label="Allow"
    />
  );
}

function ChoicesExample(): React.JSX.Element {
  return (
    <Variation label="Choices, wide">
      <View className="flex-row">
        <ScopeSplit />
      </View>
    </Variation>
  );
}

function NarrowExample(): React.JSX.Element {
  return (
    <Variation label="Choices, narrow">
      <View className="flex-row">
        <ScopeSplit narrow />
      </View>
    </Variation>
  );
}

function ActionsExample(): React.JSX.Element {
  return (
    <Variation label="Actions, compact">
      <View className="flex-row">
        <SplitButton {...mergeSplit} />
      </View>
    </Variation>
  );
}

export const Variations: Story = {
  name: 'SplitButton',
  render: () => (
    <VariationList>
      <ChoicesExample />
      <NarrowExample />
      <ActionsExample />
    </VariationList>
  ),
};

type MergeMethod = 'squash' | 'merge' | 'rebase';

const mergeMethods = [
  { value: 'squash', label: 'Squash and merge' },
  { value: 'merge', label: 'Create a merge commit' },
  { value: 'rebase', label: 'Rebase and merge' },
] as const;

// Paper's SplitButton card: Merge PR, its method chosen from the menu.
function MergeSplit(): React.JSX.Element {
  const [method, setMethod] = useState<MergeMethod>('squash');

  return (
    <SplitButton
      primary
      menuLabel="Merge options"
      options={mergeMethods}
      value={method}
      onValueChange={setMethod}
      label="Merge PR"
    />
  );
}

// The split on its own, nothing else on screen, for side-by-side captures against Paper.
export const Choices: Story = {
  render: () => (
    <View className="flex-row">
      <MergeSplit />
    </View>
  ),
};
