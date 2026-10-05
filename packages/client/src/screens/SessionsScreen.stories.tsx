import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  emptySessionListMocks,
  sessionListMocks,
} from '../../mocks/session-list-mock';
import { SessionsScreenPreview } from '../../mocks/sessions-screen-preview';
import { fails, pending } from '../../mocks/trpc-mock-link';
import { SessionsScreen } from './SessionsScreen';

const meta = {
  component: SessionsScreen,
  parameters: { trpc: sessionListMocks, previewPadding: false },
  render: () => (
    <SessionsScreenPreview>
      <SessionsScreen />
    </SessionsScreenPreview>
  ),
} satisfies Meta<typeof SessionsScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Loaded: Story = {};
export const Loading: Story = {
  parameters: { trpc: { 'session.list': pending() } },
};
export const Empty: Story = { parameters: { trpc: emptySessionListMocks } };
export const ErrorState: Story = {
  name: 'Error',
  parameters: { trpc: { 'session.list': fails('Server is down') } },
};
export const Reconnecting: Story = {
  parameters: { connection: 'reconnecting' },
};
export const Offline: Story = { parameters: { connection: 'offline' } };
