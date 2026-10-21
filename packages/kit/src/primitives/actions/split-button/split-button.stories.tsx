import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { SplitButton } from './split-button';

const meta = {
  title: 'Design System/Primitives/Actions/SplitButton',
  component: SplitButton,
  argTypes: kitArgTypes('SplitButton'),
  // A row keeps the split at its own width, as it sits in a product layout.
  decorators: [
    (Story): React.JSX.Element => (
      <View className="flex-row">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof SplitButton>;

export default meta;

// SplitButtonProps is a union (an acting half or a menu-only split), so stories type against the component.
type Story = StoryObj<typeof SplitButton>;

type MergeMethod = 'squash' | 'merge' | 'rebase';

const mergeMethods = [
  { value: 'squash', label: 'Option one' },
  { value: 'merge', label: 'Option two' },
  { value: 'rebase', label: 'Option three' },
] as const;

// One action, its method chosen from the menu: the value is controlled, so this keeps a render.
function MergeSplit(props: { narrow?: boolean }): React.JSX.Element {
  const [method, setMethod] = useState<MergeMethod>('squash');

  return (
    <SplitButton
      primary
      fullWidth={props.narrow}
      menuLabel="Options"
      options={mergeMethods}
      value={method}
      onValueChange={setMethod}
      label="Merge"
    />
  );
}

export const Choices: Story = { render: () => <MergeSplit /> };

export const Narrow: Story = { render: () => <MergeSplit narrow /> };

export const Actions: Story = {
  args: {
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
  },
  parameters: {
    docs: {
      description: { story: 'The menu lists actions rather than choices.' },
    },
  },
};
