import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { ownServerId } from '#lib/product/server-scope';
import { ServerListView } from './server-list-view';
import {
  oneServer,
  severalServers,
  unpairedServers,
} from './server-list-view-fixtures';

const meta = {
  title: 'Screens/Settings/Servers',
  component: ServerListView,
  argTypes: { servers: { control: false } },
  parameters: { screenPreview: true },
  args: {
    servers: severalServers,
    lookingAt: ownServerId,
    onOpenServer: action('open a Server'),
    onAddServer: action('add a Server'),
  },
} satisfies Meta<typeof ServerListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SeveralServers: Story = {};

// On a phone, Add a Server is a call to action in the header, not a row.
export const OnAPhone: Story = {
  globals: { viewport: { value: 'phone' } },
};

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

// The Server said it no longer knows this Device: its row says so and the page behind it says what to do.
export const AServerThatUnpairedThisDevice: Story = {
  args: { servers: unpairedServers },
};

// A web page cannot pair, so its list has no way to add a Server.
export const ServersOnly: Story = { args: { onAddServer: undefined } };
