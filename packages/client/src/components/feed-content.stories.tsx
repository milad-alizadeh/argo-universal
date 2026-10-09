import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AcpFeedContentPreview } from '../../mocks/acp-feed-content-preview';

const meta = {
  title: 'Feed/SupportedContent',
  component: AcpFeedContentPreview,
  args: { agent: 'agent-1' },
  parameters: { screenPreview: true },
} satisfies Meta<typeof AcpFeedContentPreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const SupportedContent: Story = { name: 'Supported content' };
