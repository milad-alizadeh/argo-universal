import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Button } from './button';
import {
  defaultButton,
  destructiveButton,
  disabledButton,
  extraSmallButton,
  fullWidthOnAPhoneButton,
  largeButton,
  leadingIconButton,
  linkButton,
  loadingButton,
  outlinedButton,
  secondaryButton,
  smallButton,
  textButton,
} from './button-fixtures';

const meta = {
  title: 'Design System/Primitives/Actions/Button',
  component: Button,
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

export const Default: Story = { args: defaultButton };

export const Secondary: Story = { args: secondaryButton };

export const Outlined: Story = { args: outlinedButton };

export const Text: Story = { args: textButton };

export const Link: Story = { args: linkButton };

export const Destructive: Story = { args: destructiveButton };

export const ExtraSmall: Story = {
  args: extraSmallButton,
  parameters: { docs: { description: { story: 'A phone draws Default.' } } },
};

export const Small: Story = {
  args: smallButton,
  parameters: { docs: { description: { story: 'A phone draws Default.' } } },
};

export const FullWidthOnAPhone: Story = { args: fullWidthOnAPhoneButton };

export const Large: Story = { args: largeButton };

export const Disabled: Story = { args: disabledButton };

export const Loading: Story = { args: loadingButton };

export const LeadingIcon: Story = { args: leadingIconButton };
