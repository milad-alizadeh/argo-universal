import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { SplitButton } from './split-button';

const signInMethods = [
  { value: 'github', label: 'Sign in with GitHub' },
  { value: 'api-key', label: 'Use an API key' },
  { value: 'browser', label: 'Sign in in the browser' },
];

const buildActions = [
  { label: 'Build in a new Session', onPress: fn() },
  { label: 'Save the plan', onPress: fn() },
];

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

// SplitButtonProps is a union (choices or actions), so stories type against the component.
type Story = StoryObj<typeof SplitButton>;

interface SignInProps {
  primary?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

// The chosen method is the story's state: choosing one relabels the button, pressing it signs in that way.
function SignInSplit(props: SignInProps): React.JSX.Element {
  const [method, setMethod] = useState('github');
  const label = signInMethods.find(({ value }) => value === method)?.label;

  return (
    <SplitButton
      {...props}
      label={label ?? ''}
      menuLabel="Sign-in methods"
      options={signInMethods}
      value={method}
      onValueChange={setMethod}
      onPress={fn()}
    />
  );
}

export const Choices: Story = {
  render: () => <SignInSplit primary />,
  parameters: {
    docs: {
      description: {
        story:
          'The menu changes what the button does: choosing a method relabels the button, and pressing it signs in that way.',
      },
    },
  },
};

export const Actions: Story = {
  args: {
    primary: true,
    label: 'Build',
    menuLabel: 'Build options',
    onPress: fn(),
    actions: buildActions,
  },
  parameters: {
    docs: {
      description: {
        story:
          'The button keeps its one action; the menu holds other things to do, as the Plan request does.',
      },
    },
  },
};

export const FullWidth: Story = {
  render: () => <SignInSplit primary fullWidth />,
  parameters: {
    docs: {
      description: {
        story: 'The button fills its row; the chevron keeps its width.',
      },
    },
  },
};

export const Disabled: Story = {
  render: () => <SignInSplit primary disabled />,
};
