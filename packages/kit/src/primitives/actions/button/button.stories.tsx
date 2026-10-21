import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Button } from './button';

const saveLabel = 'Save changes';

const meta = {
  title: 'Design System/Primitives/Actions/Button',
  component: Button,
  args: { label: saveLabel },
  argTypes: kitArgTypes('Button'),
  // A row keeps the button at its own width, as it sits in a product layout.
  decorators: [
    (Story): React.JSX.Element => (
      <View className="flex-row">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Outlined: Story = { args: { variant: 'outline' } };

export const Text: Story = { args: { variant: 'ghost' } };

export const Link: Story = { args: { label: 'Learn more', variant: 'link' } };

export const Destructive: Story = {
  args: { label: 'Delete', tone: 'danger', fullWidth: true },
};

export const ExtraSmall: Story = {
  args: { size: 'xs' },
  parameters: { docs: { description: { story: 'A phone draws Default.' } } },
};

export const Small: Story = {
  args: { size: 'sm' },
  parameters: { docs: { description: { story: 'A phone draws Default.' } } },
};

export const FullWidthOnAPhone: Story = {
  args: {
    label: 'Add argument',
    variant: 'ghost',
    size: 'sm',
    icon: 'add',
    fullWidth: 'narrow',
  },
};

export const Large: Story = { args: { size: 'lg' } };

export const Disabled: Story = { args: { disabled: true } };

export const Loading: Story = { args: { loading: true } };

export const LeadingIcon: Story = { args: { label: 'Add', icon: 'agent' } };
