import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { recordedImageUrl } from '../../../../lib/product/feed-message.mocks';
import { UserMessage } from './user-message';
import {
  clampedPrompt,
  imagePrompt,
  markdownPrompt,
} from './user-message-fixtures';

const meta = {
  title: 'Feed/UserMessage',
  component: UserMessage,
  argTypes: { row: { control: false }, imageUrl: { control: false } },
  args: { ...markdownPrompt, imageUrl: recordedImageUrl },
} satisfies Meta<typeof UserMessage>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * No story for a prompt's file chips: no recording holds a prompt with a resource
 * reference, and a fixture may not invent one.
 */

// A prompt as the person sent it: a right-aligned bubble of markdown.
export const Markdown: Story = { args: markdownPrompt };

// An attached image sits above the bubble.
export const Images: Story = { args: imagePrompt };

// Longer than four lines: the bubble clamps behind Show more.
export const Clamped: Story = { args: clampedPrompt };
