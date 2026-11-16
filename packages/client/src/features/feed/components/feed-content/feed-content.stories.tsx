import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { recordedAcpContent } from '../../../../lib/product/acp-feed-content.mocks';
import { toFeedView } from '../../view/to-feed-view';
import { Feed } from '../feed/feed';
import { completedCommand } from '../tool-call.mocks';

const { rows, snapshot } = recordedAcpContent('agent-1');

const meta = {
  title: 'Feed/FeedContent',
  component: Feed,
  args: {
    items: toFeedView(rows, snapshot).items,
    liveHeader: null,
    loadingOlder: false,
    onStartReached: (): void => {},
    imageUrl: (): string => '',
  },
  argTypes: {
    items: { control: false },
    liveHeader: { control: false },
    liveToolCall: { control: false },
    loadingOlder: { control: 'boolean' },
    onStartReached: { control: false },
    imageUrl: { control: false },
    checkoutBranch: { control: 'text' },
    now: { control: 'number' },
    onOpenSubagent: { control: false },
    onAtEndChange: { control: false },
  },
  parameters: { screenPreview: true },
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

// Every content block an Agent can send, drawn through one recorded Feed.
export const SupportedContent: Story = { name: 'Supported content' };

// The Agent works on after a lone Tool call settles: Working titles that call's group, never a line of its own.
export const WorkingAfterToolCall: Story = {
  name: 'Working after a Tool call',
  args: {
    items: toFeedView([completedCommand], snapshot).items,
    liveHeader: {
      text: 'Working',
      source: { type: 'working' },
      startedAt: 0,
    },
    now: 61_000,
  },
};
