import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Button } from '#primitives/actions/button';
import { ButtonGroup } from './button-group';

const meta = {
  title: 'Design System/Primitives/Actions/ButtonGroup',
  component: ButtonGroup,
  argTypes: kitArgTypes('ButtonGroup'),
  // A row keeps the group at its own width, as it sits in a product layout.
  decorators: [
    (Story): React.JSX.Element => (
      <View className="flex-row">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof ButtonGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

// ButtonGroup joins the corners of its direct children, so these stay Buttons, not a wrapper.
function secondaryButtons(labels: string[]): React.JSX.Element[] {
  return labels.map((label) => (
    <Button key={label} variant="secondary" label={label} />
  ));
}

export const Default: Story = {
  render: () => (
    <ButtonGroup>{secondaryButtons(['Previous', 'Today', 'Next'])}</ButtonGroup>
  ),
};
