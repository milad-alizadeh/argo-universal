import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { Avatar } from './avatar';

const meta = {
  title: 'Tests/Design System/Primitives/Content/Avatar',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const DescribesAvatarAndStatus: Story = {
  render: () => (
    <Avatar
      testID="sam-avatar"
      initials="SR"
      accessibilityLabel="Sam Rivera"
      status={{ tone: 'success' }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('img', { name: 'Sam Rivera, success' }),
    ).toBeVisible();
    await expect(canvas.getByTestId('sam-avatar-status')).toBeVisible();
  },
};

export const ShowsInitialsWithoutStatus: Story = {
  render: () => (
    <Avatar initials="SR" accessibilityLabel="Sam Rivera" testID="sam-avatar" />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'Sam Rivera' })).toBeVisible();
    await expect(canvas.getByText('SR')).toBeVisible();
    await expect(
      canvas.queryByTestId('sam-avatar-status'),
    ).not.toBeInTheDocument();
  },
};

export const ShowsOneInitialWhenSmall: Story = {
  render: () => (
    <Avatar size="sm" initials="SR" accessibilityLabel="Sam Rivera" />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'Sam Rivera' })).toBeVisible();
    await expect(canvas.getByText('S')).toBeVisible();
    await expect(canvas.queryByText('SR')).not.toBeInTheDocument();
  },
};

export const HidesDecorativeAvatar: Story = {
  render: () => (
    <Avatar
      initials="AG"
      accessibilityLabel="Agent, running"
      decorative
      status={{ tone: 'success' }}
      testID="decorative-avatar"
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('img')).not.toBeInTheDocument();
    await expect(canvas.getByTestId('decorative-avatar-status')).toBeVisible();
  },
};
