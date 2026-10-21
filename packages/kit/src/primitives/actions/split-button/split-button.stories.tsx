import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { SplitButton } from './split-button';
import {
  actionsSplitButton,
  choicesSplitButton,
  narrowSplitButton,
} from './split-button-fixtures';

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

type ChoicesProps = typeof choicesSplitButton & { fullWidth?: boolean };

// The chosen method is controlled by the story, so each state keeps a render.
function MergeSplit(props: ChoicesProps): React.JSX.Element {
  const [method, setMethod] = useState('squash');

  return <SplitButton {...props} value={method} onValueChange={setMethod} />;
}

export const Choices: Story = {
  render: () => <MergeSplit {...choicesSplitButton} />,
};

export const Narrow: Story = {
  render: () => <MergeSplit {...narrowSplitButton} />,
};

export const Actions: Story = {
  args: {
    ...actionsSplitButton,
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
