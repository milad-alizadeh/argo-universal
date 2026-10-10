import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fails, pending } from '../../../../mocks/trpc-mock-link';
import { ConnectionScreen } from './connection-screen';
import { connectionScreenMocks } from './connection-screen.mocks';

const meta = {
  title: 'screens/ConnectionScreen',
  component: ConnectionScreen,
  parameters: { trpc: connectionScreenMocks },
} satisfies Meta<typeof ConnectionScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loaded: Story = {};

export const Loading: Story = {
  parameters: { trpc: { 'system.info': pending() } },
};

// Named so it does not shadow the global Error.
export const ErrorState: Story = {
  name: 'Error',
  parameters: { trpc: { 'system.info': fails('Server is down') } },
};

export const Reconnecting: Story = {
  parameters: { connection: 'reconnecting' },
};

export const Offline: Story = {
  parameters: { connection: 'offline' },
};
