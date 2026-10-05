import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { sessionListMocks } from '../../mocks/session-list-mock';
import { SessionsScreenPreview } from '../../mocks/sessions-screen-preview';
import { SessionsScreen } from './SessionsScreen';

const meta = {
  title: 'Screens/SessionsScreen',
  component: SessionsScreen,
  parameters: {
    trpc: sessionListMocks,
    previewPadding: false,
    screenPreview: true,
  },
  render: () => (
    <SessionsScreenPreview>
      <SessionsScreen />
    </SessionsScreenPreview>
  ),
} satisfies Meta<typeof SessionsScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Loaded: Story = {};
export const Reconnecting: Story = {
  parameters: { connection: 'reconnecting' },
};
export const Offline: Story = { parameters: { connection: 'offline' } };
