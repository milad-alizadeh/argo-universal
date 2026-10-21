import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Avatar } from './avatar';

const meta = {
  title: 'Design System/Primitives/Content/Avatar',
  component: Avatar,
  argTypes: kitArgTypes('Avatar'),
  args: { initials: 'SR', accessibilityLabel: 'Sam Rivera' },
  tags: ['third-party'],
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Initials: Story = {};

export const Small: Story = { args: { size: 'sm' } };

export const Neutral: Story = { args: { status: { tone: 'neutral' } } };

export const Muted: Story = { args: { status: { tone: 'muted' } } };

export const Accent: Story = { args: { status: { tone: 'accent' } } };

export const Info: Story = { args: { status: { tone: 'info' } } };

export const Success: Story = { args: { status: { tone: 'success' } } };

export const Warning: Story = { args: { status: { tone: 'warning' } } };

export const Danger: Story = { args: { status: { tone: 'danger' } } };

export const Done: Story = { args: { status: { tone: 'done' } } };
