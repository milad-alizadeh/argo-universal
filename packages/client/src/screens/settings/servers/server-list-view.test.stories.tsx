import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { ownServerId } from '#lib/product/server-scope';
import { ServerListView } from './server-list-view';
import {
  oneServer,
  severalServers,
  unpairedServers,
} from './server-list-view-fixtures';

const addServer = { name: 'Add a Server' };

const meta = {
  title: 'Tests/Screens/Settings/Servers',
  component: ServerListView,
  parameters: { screenPreview: true },
  args: {
    servers: severalServers,
    lookingAt: ownServerId,
    onOpenServer: fn(),
    onAddServer: fn(),
  },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof ServerListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EachServerSaysItsOwnState: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: /Studio, Connected/ }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('link', {
        name: /Workshop bench, Not found on this network/,
      }),
    ).toBeVisible();
  },
};

// One Server is a Server shown, so nothing reads as empty, degraded or still to be set up.
export const OneServerReadsAsTheOrdinaryCase: Story = {
  args: { servers: oneServer },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: /Showing · Connected/ }),
    ).toBeVisible();
    await expect(
      canvas.queryByText(/no Servers|pair this|empty|unavailable/i),
    ).toBeNull();
  },
};

export const OpensAServersPageWhenItsRowIsPressed: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('link', { name: /Studio/ }));
    await expect(args.onOpenServer).toHaveBeenCalledOnce();
    await expect(args.onOpenServer).toHaveBeenCalledWith('studio');
  },
};

export const SaysWhichServerIsShown: Story = {
  args: { lookingAt: 'studio' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: /Studio, Showing · Connected/ }),
    ).toBeVisible();
  },
};

// A Server that unpaired this Device is told apart from one that is only asleep.
export const AServerThatUnpairedThisDeviceNeedsPairingAgain: Story = {
  args: { servers: unpairedServers },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: /Studio, Needs pairing again/ }),
    ).toBeVisible();
  },
};

export const AddAServerIsARowBelowTheListWhenWide: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', addServer));
    await expect(args.onAddServer).toHaveBeenCalledOnce();
    await expect(args.onOpenServer).not.toHaveBeenCalled();
  },
};

export const NoAddRowWhereAnAppCannotPair: Story = {
  args: { onAddServer: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(addServer.name)).toBeNull();
  },
};

// On a phone, Add a Server is the header's call to action, not a row.
export const AddAServerIsAHeaderActionOnAPhone: Story = {
  beforeEach: (): Promise<void> => settleLayout('phone'),
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', addServer));
    await expect(args.onAddServer).toHaveBeenCalledOnce();
    await expect(canvas.queryByText(addServer.name)).toBeNull();
  },
};
