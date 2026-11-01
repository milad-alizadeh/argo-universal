import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { ownServerId } from '#lib/product/server-scope';
import { ServerListView } from './server-list-view';
import { oneServer, severalServers } from './server-list-view-fixtures';

// A row is spoken as its Server and that Server's state, which the picker reads from the option's label and subtitle.
const ownRow = 'This computer Connected';

const studioRow = 'Studio Connected';

const meta = {
  title: 'Tests/Screens/Settings/Servers',
  component: ServerListView,
  parameters: { screenPreview: true },
  args: {
    servers: severalServers,
    lookingAt: ownServerId,
    onLookAt: fn(),
    onAddServer: fn(),
  },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof ServerListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EachServerSaysItsOwnState: Story = {
  play: async ({ canvas }) => {
    for (const name of [ownRow, studioRow, 'Workshop bench Unreachable'])
      await expect(canvas.getByRole('radio', { name })).toBeVisible();
  },
};

// One Server is a Server chosen, so nothing reads as empty, degraded or still to be set up.
export const OneServerReadsAsTheOrdinaryCase: Story = {
  args: { servers: oneServer },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radio', { name: ownRow })).toBeVisible();
    await expect(
      canvas.queryByText(/no Servers|Pair|empty|unavailable/i),
    ).toBeNull();
  },
};

export const ShowsAnotherServerWhenItsRowIsPressed: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('radio', { name: studioRow }));
    await expect(args.onLookAt).toHaveBeenCalledOnce();
    await expect(args.onLookAt).toHaveBeenCalledWith('studio');
  },
};

export const PressingTheShownServerLeavesItShown: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('radio', { name: ownRow }));
    await expect(args.onLookAt).not.toHaveBeenCalled();
  },
};

// The row's own check is what says which Server is being shown; no line of copy repeats it.
export const TheShownServersRowIsTheChosenOne: Story = {
  args: { lookingAt: 'studio' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('radio', { name: studioRow, checked: true }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('radio', { name: ownRow, checked: false }),
    ).toBeVisible();
  },
};

export const AddAServerIsTheLastRow: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add a Server' }));
    await expect(args.onAddServer).toHaveBeenCalledOnce();
    await expect(args.onLookAt).not.toHaveBeenCalled();
  },
};

export const NoAddRowWhereAnAppCannotPair: Story = {
  args: { onAddServer: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('Add a Server')).toBeNull();
  },
};
