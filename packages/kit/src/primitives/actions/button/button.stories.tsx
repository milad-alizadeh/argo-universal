import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, fn } from 'storybook/test';
import { Button, type ButtonProps } from './button';

const label = 'Save changes';

const primaryButton = { label } satisfies ButtonProps;

const secondaryButton = { label, variant: 'secondary' } satisfies ButtonProps;

const textButton = { label, variant: 'text' } satisfies ButtonProps;

const dangerButton = {
  label: 'Delete',
  variant: 'danger',
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
  // The kit Button's props are its own, not the Plugin wire's, so the table is declared here.
  argTypes: {
    label: { control: 'text' },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'text', 'danger'],
    },
    size: { control: 'select', options: ['sm', 'md'] },
    fullWidth: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
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

export const Small: Story = { args: smallButton };

export const FullWidth: Story = { args: fullWidthButton };

export const Disabled: Story = { args: disabledButton };

export const LeadingIcon: Story = { args: leadingIconButton };

export const SmallLeadingIcon: Story = { args: smallLeadingIconButton };

// Test-only: hidden from the sidebar and Docs, still run by the story tests.
export const Activation: Story = {
  tags: ['!dev', '!autodocs'],
  args: { label: 'Continue', onPress: fn() },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
    await expect(args.onPress).toHaveBeenCalledOnce();
  },
};

export const DisabledIgnoresPress: Story = {
  tags: ['!dev', '!autodocs'],
  args: { ...disabledButton, onPress: fn() },
  play: async ({ canvas, args }) => {
    const button = canvas.getByRole('button', { name: label });
    await expect(button).toBeDisabled();
    button.click();
    await expect(args.onPress).not.toHaveBeenCalled();
  },
};

export const LeadingIconRenders: Story = {
  tags: ['!dev', '!autodocs'],
  args: leadingIconButton,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Add' })).toBeVisible();
  },
};
