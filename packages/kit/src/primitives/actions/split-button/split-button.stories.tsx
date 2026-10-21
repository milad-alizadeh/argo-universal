import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Variation, Variations as VariationList } from '../../../variations';
import { SplitButton } from './split-button';

const meta = {
  title: 'Design System/Primitives/Actions/SplitButton',
  component: SplitButton,
  argTypes: kitArgTypes('SplitButton'),
} satisfies Meta;

export default meta;

type Story = StoryObj;

type Scope = 'once' | 'always';

const scopes = [
  { value: 'once', label: 'Allow once' },
  { value: 'always', label: 'Always allow' },
] as const;

const mergeSplit = {
  size: 'xs',
  primary: true,
  label: 'Merge',
  icon: 'merged',
  menuLabel: 'Options',
  actions: [
    { label: 'Option one', onPress: fn() },
    { label: 'Option two', onPress: fn() },
    { label: 'Option three', onPress: fn() },
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
  { value: 'squash', label: 'Option one' },
  { value: 'merge', label: 'Option two' },
  { value: 'rebase', label: 'Option three' },
] as const;

// Paper's SplitButton card: one action, its method chosen from the menu.
function MergeSplit(): React.JSX.Element {
  const [method, setMethod] = useState<MergeMethod>('squash');

  return (
    <SplitButton
      primary
      menuLabel="Options"
      options={mergeMethods}
      value={method}
      onValueChange={setMethod}
      label="Merge"
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
