import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Avatar } from './avatar';
import {
  accentAvatar,
  dangerAvatar,
  doneAvatar,
  infoAvatar,
  initialsAvatar,
  mutedAvatar,
  neutralAvatar,
  smallAvatar,
  successAvatar,
  warningAvatar,
} from './avatar-fixtures';

const meta = {
  title: 'Design System/Primitives/Content/Avatar',
  component: Avatar,
  argTypes: kitArgTypes('Avatar'),
  tags: ['third-party'],
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Initials: Story = { args: initialsAvatar };

export const Small: Story = { args: smallAvatar };

export const Neutral: Story = { args: neutralAvatar };

export const Muted: Story = { args: mutedAvatar };

export const Accent: Story = { args: accentAvatar };

export const Info: Story = { args: infoAvatar };

export const Success: Story = { args: successAvatar };

export const Warning: Story = { args: warningAvatar };

export const Danger: Story = { args: dangerAvatar };

export const Done: Story = { args: doneAvatar };
