import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { NotFoundView } from './not-found-view';

const meta = {
  title: 'Screens/Settings/NotFoundView',
  component: NotFoundView,
  parameters: { screenPreview: true },
  args: { serverName: 'Studio Server', onTryAgain: fn(), onScanAgain: fn() },
  argTypes: {
    serverName: { control: 'text' },
    onTryAgain: { control: false },
    onScanAgain: { control: false },
  },
} satisfies Meta<typeof NotFoundView>;

export default meta;

type Story = StoryObj<typeof meta>;

// The network did not announce the Server: the page takes the address the other computer shows.
export const ServerNotFound: Story = {};
