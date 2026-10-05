import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fails, pending } from '../../mocks/trpc-mock-link';
import { ConnectionScreen } from './ConnectionScreen';
import { connectionScreenMocks } from './ConnectionScreen.mocks';

const meta = {
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
