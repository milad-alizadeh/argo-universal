import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { logoSources } from '../../../symbols/logo-source';
import { Text } from '../../content/text';
import { IconButton } from './icon-button';

const filterDot = (
  <View className="absolute top-1.5 right-1.5 size-1.75 rounded-full border border-card bg-foreground" />
);

const meta = {
  title: 'Design System/Primitives/Actions/IconButton',
  component: IconButton,
  args: { icon: 'more', accessibilityLabel: 'More actions' },
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

export const Default: Story = {};

const sidebarArgs = {
  icon: 'sidebar',
  variant: 'ghost',
  accessibilityLabel: 'Sidebar',
} as const;

export const ExtraSmall: Story = { args: { ...sidebarArgs, size: 'xs' } };

export const Small: Story = { args: { ...sidebarArgs, size: 'sm' } };

export const Medium: Story = { args: { ...sidebarArgs, size: 'md' } };

export const Large: Story = { args: { ...sidebarArgs, size: 'lg' } };

export const ExtraLarge: Story = { args: { ...sidebarArgs, size: 'xl' } };

export const Selected: Story = {
  args: {
    icon: 'bold',
    variant: 'ghost',
    size: 'xs',
    accessibilityLabel: 'Bold',
    selected: true,
  },
};

export const Disabled: Story = { args: { disabled: true } };

export const Loading: Story = { args: { loading: true } };

export const Badge: Story = {
  args: {
    icon: 'filters',
    variant: 'ghost',
    accessibilityLabel: 'Filters',
    badge: filterDot,
  },
};

const metaLinkProps = {
  size: 'xs',
  variant: 'ghost',
  iconTone: 'muted',
  bleed: true,
} as const;

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
      <IconButton
        {...metaLinkProps}
        iconSource={logoSources.github}
        accessibilityLabel="Link"
      />
      <IconButton {...metaLinkProps} icon="web" accessibilityLabel="Web" />
    </View>
  ),
};
