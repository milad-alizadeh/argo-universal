import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { ownServerId } from '#lib/product/server-scope';
import { ServerListView } from './server-list-view';
import { oneServer, severalServers } from './server-list-view-fixtures';

const ownRow = 'This computer, Connected';

const studioRow = 'Studio, Connected';

const meta = {
  title: 'Tests/Screens/Settings/Servers',
  component: ServerListView,
  parameters: { screenPreview: true },
  args: {
    servers: severalServers,
    lookingAt: ownServerId,
    onLookAt: fn(),
  },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof ServerListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EachServerSaysItsOwnState: Story = {
  play: async ({ canvas }) => {
    for (const name of [ownRow, studioRow, 'Workshop bench, Unreachable'])
      await expect(canvas.getByRole('button', { name })).toBeVisible();
  },
};

// One Server is a Server chosen, so nothing reads as empty, degraded or still to be set up.
export const OneServerReadsAsTheOrdinaryCase: Story = {
  args: { servers: oneServer },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: ownRow })).toBeVisible();
    await expect(
      canvas.getByText('Argo is showing the Server on this computer.'),
    ).toBeVisible();
    await expect(
      canvas.queryByText(/no Servers|Pair|empty|unavailable/i),
    ).toBeNull();
  },
};

export const ShowsAnotherServerWhenItsRowIsPressed: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: studioRow }));
    await expect(args.onLookAt).toHaveBeenCalledOnce();
    await expect(args.onLookAt).toHaveBeenCalledWith('studio');
  },
};

export const PressingTheShownServerLeavesItShown: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: ownRow }));
    await expect(args.onLookAt).not.toHaveBeenCalled();
  },
};

export const SaysWhichServerItIsShowing: Story = {
  args: { lookingAt: 'studio' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Argo is showing Studio\./)).toBeVisible();
  },
};
