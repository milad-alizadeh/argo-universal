import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Button, type ButtonProps } from './button';

const label = 'Save changes';

const primaryButton = { label } satisfies ButtonProps;

const secondaryButton = { label, variant: 'secondary' } satisfies ButtonProps;

const textButton = { label, variant: 'text' } satisfies ButtonProps;

const dangerButton = {
  label: 'Delete',
  variant: 'danger',
} satisfies ButtonProps;

const extraSmallButton = {
  label,
  variant: 'secondary',
  size: 'xs',
} satisfies ButtonProps;

const smallButton = { label, size: 'sm' } satisfies ButtonProps;

const fullWidthButton = { label, fullWidth: true } satisfies ButtonProps;

const disabledButton = { label, disabled: true } satisfies ButtonProps;

const leadingIconButton = { label: 'Add', icon: 'add' } satisfies ButtonProps;

const smallLeadingIconButton = {
  ...leadingIconButton,
  size: 'sm',
} satisfies ButtonProps;

const meta = {
  title: 'Design System/Primitives/Actions/Button',
  component: Button,
  argTypes: kitArgTypes('Button'),
  // The button keeps its own width, as it sits in a product layout; a full-width one fills the row.
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-full items-start">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: primaryButton };

export const Secondary: Story = { args: secondaryButton };

export const Text: Story = { args: textButton };

export const Danger: Story = { args: dangerButton };

export const ExtraSmall: Story = { args: extraSmallButton };

export const Small: Story = { args: smallButton };

export const FullWidth: Story = { args: fullWidthButton };

export const Disabled: Story = { args: disabledButton };

export const LeadingIcon: Story = { args: leadingIconButton };

export const SmallLeadingIcon: Story = { args: smallLeadingIconButton };
