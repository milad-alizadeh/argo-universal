import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { Text } from '#primitives/content/text';
import { LiquidGlass } from './liquid-glass';

function GlassText({ text }: { text: string }): React.JSX.Element {
  return (
    <Text role="body" className="px-4 py-1">
      {text}
    </Text>
  );
}

// The web and Android draw each fallback surface; the iOS preview draws Liquid Glass on iOS 26 and later.
const meta = {
  title: 'Design System/Primitives/Content/LiquidGlass',
  component: LiquidGlass,
  args: { children: <GlassText text="Message" /> },
  // LiquidGlass has no Contracts schema, so its own props type gives the domain.
  argTypes: {
    corners: { control: 'select', options: ['container', 'sheet', 'pill'] },
    children: { control: false },
  },
} satisfies Meta<typeof LiquidGlass>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Sheet: Story = {
  args: {
    corners: 'sheet',
    className: 'w-full',
    fallbackClassName: 'rounded-2xl bg-card shadow-glass',
  },
};

export const Pill: Story = {
  args: {
    children: <GlassText text="Label" />,
    corners: 'pill',
    interactive: true,
    className: 'h-6 justify-center self-start',
    fallbackClassName: 'rounded-full border border-border bg-card shadow-card',
  },
};
