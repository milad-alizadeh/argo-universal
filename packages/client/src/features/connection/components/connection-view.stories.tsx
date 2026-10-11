import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ConnectionView } from './connection-view';
import { loadedServer } from './connection-view.fixtures';

const meta = {
  title: 'Screens/ConnectionScreen',
  component: ConnectionView,
  args: { connection: 'open', server: loadedServer },
  parameters: { screenPreview: true },
} satisfies Meta<typeof ConnectionView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loaded: Story = {};

export const Loading: Story = {
  args: { server: { status: 'loading' } },
};

// Named so it does not shadow the global Error.
export const ErrorState: Story = {
  name: 'Error',
  args: { server: { status: 'error', message: 'Server is down' } },
};

export const Reconnecting: Story = {
  args: { connection: 'reconnecting' },
};

export const Offline: Story = {
  args: { connection: 'offline' },
};
