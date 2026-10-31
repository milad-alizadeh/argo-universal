import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { ownServerId } from '#lib/product/server-scope';
import { ServerListView } from './server-list-view';
import { oneServer, severalServers } from './server-list-view-fixtures';

const meta = {
  title: 'Screens/Settings/Servers',
  component: ServerListView,
  argTypes: { servers: { control: false } },
  parameters: { screenPreview: true },
  args: {
    servers: severalServers,
    lookingAt: ownServerId,
    onLookAt: action('look at a Server'),
  },
} satisfies Meta<typeof ServerListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SeveralServers: Story = {};

// One Server reads as a Server chosen, not as a list with something missing.
export const OneServer: Story = { args: { servers: oneServer } };

export const ShowingAPairedServer: Story = { args: { lookingAt: 'studio' } };

export const AServerStillConnecting: Story = {
  args: {
    servers: severalServers.map((server) =>
      server.id === 'studio' ? { ...server, state: 'connecting' } : server,
    ),
  },
};
