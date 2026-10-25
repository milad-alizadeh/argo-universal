import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { Text, View } from 'react-native';
import { expect, fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { IconButton, type IconButtonProps } from './icon-button';
import { StockProbe } from './stock-probe';

const accessibilityLabel = 'Favourite';

const primaryIconButton = {
  icon: 'heart',
  accessibilityLabel,
} satisfies IconButtonProps;

const secondaryIconButton = {
  ...primaryIconButton,
  variant: 'secondary',
} satisfies IconButtonProps;

const ghostIconButton = {
  ...primaryIconButton,
  variant: 'ghost',
} satisfies IconButtonProps;

const smallIconButton = {
  ...primaryIconButton,
  size: 'sm',
} satisfies IconButtonProps;

const largeIconButton = {
  ...primaryIconButton,
  size: 'lg',
} satisfies IconButtonProps;

const selectedIconButton = {
  ...primaryIconButton,
  selected: true,
} satisfies IconButtonProps;

const disabledIconButton = {
  ...primaryIconButton,
  disabled: true,
} satisfies IconButtonProps;

const meta = {
  title: 'Design System/Primitives/Actions/IconButton',
  component: IconButton,
  argTypes: kitArgTypes('IconButton'),
  // The button keeps its own width, as it sits in a product layout.
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-full items-start">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: primaryIconButton };

export const Secondary: Story = { args: secondaryIconButton };

export const Ghost: Story = { args: ghostIconButton };

export const Small: Story = { args: smallIconButton };

export const Large: Story = { args: largeIconButton };

export const Selected: Story = { args: selectedIconButton };

export const Disabled: Story = {
  args: { ...disabledIconButton, onPress: fn() },
  play: async ({ canvas, args }) => {
    const button = canvas.getByRole('button', { name: accessibilityLabel });
    await expect(button).toBeDisabled();
    button.click();
    await expect(args.onPress).not.toHaveBeenCalled();
  },
};

// TEMPORARY: every size in each variant side by side, to compare platforms; delete once the iOS sizing is fixed.
export const Probe: Story = {
  args: primaryIconButton,
  render: () => (
    <View className="gap-8">
      <View className="flex-row items-end gap-6">
        {(['sm', 'md', 'lg'] as const).map((size) => (
          <View key={size} className="items-center gap-2">
            <IconButton {...primaryIconButton} icon="heart" size={size} />
            <Text>{size}</Text>
          </View>
        ))}
      </View>
      <StockProbe />
    </View>
  ),
};

// Test-only: hidden from the sidebar and Docs, still run by the story tests.
export const Activation: Story = {
  tags: ['!dev', '!autodocs'],
  args: { ...primaryIconButton, onPress: fn() },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: accessibilityLabel }),
    );
    await expect(args.onPress).toHaveBeenCalledOnce();
  },
};
