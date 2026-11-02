import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { ServerDetailView } from './server-detail-view';
import {
  connectedServer,
  notAllowedServer,
  ownServer,
  shownServer,
  unreachableServer,
} from './server-detail-view-fixtures';

const meta = {
  title: 'Screens/Settings/Servers/Server',
  component: ServerDetailView,
  argTypes: { server: { control: false } },
  parameters: { screenPreview: true },
  args: {
    server: shownServer,
    onShow: action('show its Sessions'),
    onTryAgain: action('try again'),
    onPairAgain: action('pair again'),
    onUnpair: action('unpair'),
    onBack: action('back'),
  },
} satisfies Meta<typeof ServerDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Connected: Story = {};

export const NotShown: Story = { args: { server: connectedServer } };

// Not found: the computer is asleep or elsewhere, so the way forward is Try again.
export const NotFound: Story = { args: { server: unreachableServer } };

// Not allowed: the Server answered and does not know this Device, so only Pair again helps.
export const NotAllowed: Story = { args: { server: notAllowedServer } };

// The Server on this Device has nothing to unpair from.
export const OwnServer: Story = { args: { server: ownServer } };

export const Missing: Story = { args: { server: { status: 'missing' } } };
