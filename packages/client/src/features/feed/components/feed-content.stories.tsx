import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { recordedAcpContent } from '../../../lib/product/acp-feed-content.mocks';
import { toFeedView } from '../view/to-feed-view';
import { Feed } from './feed';

const { rows, snapshot } = recordedAcpContent('agent-1');
const meta = {
  title: 'Feed/SupportedContent',
  component: Feed,
  args: {
    items: toFeedView(rows, snapshot).items,
    liveHeader: null,
    loadingOlder: false,
    onStartReached: (): void => {},
    imageUrl: (): string => '',
  },
  parameters: { screenPreview: true },
} satisfies Meta<typeof Feed>;
export default meta;
type Story = StoryObj<typeof meta>;
export const SupportedContent: Story = { name: 'Supported content' };
