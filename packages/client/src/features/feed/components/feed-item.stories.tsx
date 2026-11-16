import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { FeedItem } from './feed-item';
import { mixedTools } from './feed-item-fixtures';

const meta = {
  title: 'Feed/FeedItem',
  component: FeedItem,
  argTypes: {
    item: { control: false },
    imageUrl: { control: false },
    onOpenSubagent: { control: false },
    now: { control: false },
    streaming: { control: false },
  },
} satisfies Meta<typeof FeedItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MixedTools: Story = { args: mixedTools };
