import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { LiquidGlass } from './liquid-glass';
import { pillLiquidGlass, sheetLiquidGlass } from './liquid-glass-fixtures';

// The web and Android draw each fallback surface; the iOS preview draws Liquid Glass on iOS 26 and later.
const meta = {
  title: 'Design System/Primitives/Content/LiquidGlass',
  component: LiquidGlass,
  // LiquidGlass has no Contracts schema, so its own props type gives the domain.
  argTypes: {
    corners: { control: 'select', options: ['container', 'sheet', 'pill'] },
    children: { control: false },
  },
} satisfies Meta<typeof LiquidGlass>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Sheet: Story = { args: sheetLiquidGlass };

export const Pill: Story = { args: pillLiquidGlass };
