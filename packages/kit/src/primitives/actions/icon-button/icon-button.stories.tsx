import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Text } from '../../content/text';
import { IconButton } from './icon-button';
import {
  badgeIconButton,
  bleedLogoIconButton,
  bleedWebIconButton,
  defaultIconButton,
  disabledIconButton,
  extraLargeIconButton,
  extraSmallIconButton,
  largeIconButton,
  loadingIconButton,
  mediumIconButton,
  selectedIconButton,
  smallIconButton,
} from './icon-button-fixtures';

const meta = {
  title: 'Design System/Primitives/Actions/IconButton',
  component: IconButton,
  argTypes: kitArgTypes('IconButton'),
  // A row keeps the button at its own width, as it sits in a product layout.
  decorators: [
    (Story): React.JSX.Element => (
      <View className="flex-row items-center">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof IconButton>;

export default meta;

// IconButtonProps is a union (a named icon or a logo source), so stories type against the component.
type Story = StoryObj<typeof IconButton>;

export const Default: Story = { args: defaultIconButton };

export const ExtraSmall: Story = { args: extraSmallIconButton };

export const Small: Story = { args: smallIconButton };

export const Medium: Story = { args: mediumIconButton };

export const Large: Story = { args: largeIconButton };

export const ExtraLarge: Story = { args: extraLargeIconButton };

export const Selected: Story = { args: selectedIconButton };

export const Disabled: Story = { args: disabledIconButton };

export const Loading: Story = { args: loadingIconButton };

export const Badge: Story = { args: badgeIconButton };

/*
 * Each glyph sits on the text line and the row's gap; its hit area bleeds past it.
 * A logo and a symbol side by side, so the row keeps its own render.
 */
export const Bleed: Story = {
  render: () => (
    <View className="flex-row items-center gap-3">
      <Text role="secondary" tone="muted">
        v1.0.0
      </Text>
      <IconButton {...bleedLogoIconButton} />
      <IconButton {...bleedWebIconButton} />
    </View>
  ),
};
