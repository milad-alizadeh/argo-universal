import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { ConnectionDetailView } from './connection-detail-view';
import { loadedServer } from './connection-detail-view.fixtures';

const meta = {
  title: 'Screens/Settings/Connection',
  component: ConnectionDetailView,
  argTypes: { server: { control: false } },
  args: { server: loadedServer },
  parameters: { screenPreview: true },
} satisfies Meta<typeof ConnectionDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Connected: Story = {};

export const KeepRunningOff: Story = {
  args: { keepRunning: { enabled: false, onChange: fn() } },
};

export const KeepRunningOn: Story = {
  args: { keepRunning: { enabled: true, onChange: fn() } },
};

// Off by default: only this computer reaches Argo, and Devices cannot be paired.
export const LocalAccessOff: Story = {
  args: { localAccess: { enabled: false, onChange: fn() } },
};

export const LocalAccessOn: Story = {
  args: {
    localAccess: {
      enabled: true,
      computerName: 'Studio Mac',
      onChange: fn(),
    },
  },
};

// The red row asks first; the Server stops only when the owner answers.
export const StopServer: Story = {
  args: {
    keepRunning: { enabled: true, onChange: fn() },
    stopServer: { onStop: fn() },
  },
};

export const Connecting: Story = {
  args: { server: { status: 'loading' } },
};

// Named so it does not shadow the global Error.
export const ErrorState: Story = {
  name: 'Error',
  args: { server: { status: 'error', message: "Couldn't reach the Server." } },
};
