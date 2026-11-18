import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { FeedItem } from './feed-item';
import { mixedTools } from './feed-item-fixtures';
import { personSaid, personSaying } from './transcript/transcript-fixtures';

const meta = {
  title: 'Feed/FeedItem',
  component: FeedItem,
  args: { imageUrl: (): string => '' },
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

// What the person said on a Voice call is their message: a bubble.
export const PersonSaid: Story = { args: personSaid };

// Words the person is still saying: the bubble's text in the muted colour until final.
export const PersonSaying: Story = { args: personSaying };
