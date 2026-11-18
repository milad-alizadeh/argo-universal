import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { PairSheetView } from './pair-sheet-view';

const meta = {
  title: 'Screens/Settings/PairSheetView',
  component: PairSheetView,
  parameters: { screenPreview: true },
  args: {
    kind: 'denied',
    serverName: 'Studio',
    onOpenSettings: fn(),
    onBack: fn(),
    onTryAgain: fn(),
    onCancel: fn(),
  },
  argTypes: {
    kind: {
      control: 'select',
      options: [
        'denied',
        'undetermined',
        'misconfigured',
        'finding',
        'not-found',
      ],
    },
    serverName: { control: 'text' },
    onOpenSettings: { control: false },
    onBack: { control: false },
    onTryAgain: { control: false },
    onCancel: { control: false },
  },
} satisfies Meta<typeof PairSheetView>;

export default meta;

type Story = StoryObj<typeof meta>;

// The owner turned Local Network off for the App: the sheet says where to turn it back on.
export const LocalNetworkOff: Story = {};

// iOS has not been answered yet; the look carries on and the owner may try again.
export const WaitingForAccess: Story = { args: { kind: 'undetermined' } };

// A debug build that never declared `_argo._tcp`: only its developers can mend it, so the one way on is back.
export const BuildCannotBrowse: Story = { args: { kind: 'misconfigured' } };

// After a scan, while the Server is being looked for on the network.
export const FindingTheServer: Story = { args: { kind: 'finding' } };

// The network did not announce the Server: the sheet takes the address the other computer shows.
export const ServerNotFound: Story = { args: { kind: 'not-found' } };
