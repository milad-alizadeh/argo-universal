import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { recordedImageUrl } from '../../../../lib/product/feed-message.mocks';
import { FeedItem } from '../feed-item';
import {
  delegatedPrompt,
  pluginPrompt,
  markdownPrompt,
} from './user-message-fixtures';

const meta = {
  title: 'Tests/Feed/UserMessage/Sender',
  component: FeedItem,
  args: {
    item: { type: 'row', row: delegatedPrompt.row },
    imageUrl: recordedImageUrl,
  },
} satisfies Meta<typeof FeedItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Session: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('From Review changes')).toBeVisible();
    await expect(canvas.getByText(/Please review the/)).toBeVisible();
  },
};

export const Plugin: Story = {
  args: { item: { type: 'row', row: pluginPrompt.row } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('From Automation')).toBeVisible();
    await expect(canvas.queryByText('From Review changes')).toBeNull();
  },
};

export const Human: Story = {
  args: { item: { type: 'row', row: markdownPrompt.row } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/^From /)).toBeNull();
    await expect(canvas.getByText(/Please review the/)).toBeVisible();
  },
};
