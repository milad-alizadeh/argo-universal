import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Orb } from './orb';

const meta = {
  title: 'Design System/Primitives/Status/Orb',
  component: Orb,
  args: { state: 'working', size: 'md' },
} satisfies Meta<typeof Orb>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Working: Story = {};

export const Searching: Story = { args: { state: 'searching' } };

export const Solving: Story = { args: { state: 'solving' } };

export const Listening: Story = { args: { state: 'listening' } };

export const Composing: Story = { args: { state: 'composing' } };

export const Shaping: Story = { args: { state: 'shaping' } };

export const Inline: Story = { args: { size: 'sm' } };

export const Paused: Story = { args: { paused: true } };
