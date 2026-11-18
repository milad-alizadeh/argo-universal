import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { LocalNetworkView } from './local-network-view';

const meta = {
  title: 'Screens/Settings/LocalNetworkView',
  component: LocalNetworkView,
  parameters: { screenPreview: true },
  args: {
    kind: 'denied',
    serverName: 'Studio Server',
    onOpenSettings: fn(),
    onBack: fn(),
    onTryAgain: fn(),
  },
  argTypes: {
    kind: {
      control: 'select',
      options: ['denied', 'misconfigured', 'undetermined'],
    },
    serverName: { control: 'text' },
    onOpenSettings: { control: false },
    onBack: { control: false },
    onTryAgain: { control: false },
  },
} satisfies Meta<typeof LocalNetworkView>;

export default meta;

type Story = StoryObj<typeof meta>;

// The owner turned Local Network off for the App: the page says where to turn it back on.
export const LocalNetworkOff: Story = {};

// A debug build that never declared `_argo._tcp`: only its developers can mend it, so the one way on is back.
export const BuildCannotBrowse: Story = { args: { kind: 'misconfigured' } };

// iOS has not been answered yet; the look carries on and the owner may try again.
export const WaitingForAccess: Story = { args: { kind: 'undetermined' } };
