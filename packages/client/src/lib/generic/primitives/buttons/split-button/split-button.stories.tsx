import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { Button } from '#primitives/buttons/button/button';
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
  menuLabel: 'Merge options',
  actions: [
    { label: 'Squash and merge', onSelect: fn() },
    { label: 'Create a merge commit', onSelect: fn() },
    { label: 'Rebase and merge', onSelect: fn() },
  ],
} as const;

const mergeButton = (
  <Button
    appearance="content"
    size="xs"
    icon="merged"
    label="Merge PR"
    className="web:shadow-none"
  />
);

function ScopeSplit(props: { narrow?: boolean }): React.JSX.Element {
  const [scope, setScope] = useState<Scope>('once');

  return (
    <SplitButton
      primary
      narrow={props.narrow}
      menuLabel="Allow options"
      choices={scopes}
      value={scope}
      onValueChange={setScope}
    >
      <Button appearance="content" label="Allow" />
    </SplitButton>
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
    <Variation label="Choices, narrow (Sheet)">
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
        <SplitButton {...mergeSplit}>{mergeButton}</SplitButton>
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
