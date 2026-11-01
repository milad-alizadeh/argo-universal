import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { ServerDetailView } from './server-detail-view';
import {
  connectedServer,
  notAllowedServer,
  ownServer,
  shownServer,
  unreachableServer,
} from './server-detail-view-fixtures';

const body = within(document.body);

const meta = {
  title: 'Tests/Screens/Settings/Servers/Server',
  component: ServerDetailView,
  parameters: { screenPreview: true },
  args: {
    server: shownServer,
    onShow: fn(),
    onTryAgain: fn(),
    onPairAgain: fn(),
    onUnpair: fn(),
  },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof ServerDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const UnpairAsksFirstAndCancelKeepsTheServer: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
    await userEvent.click(canvas.getByRole('button', { name: 'Unpair' }));

    const alert = within(await body.findByRole('dialog'));

    await expect(alert.getByText(/loses access straight away/)).toBeVisible();
    await userEvent.click(alert.getByRole('button', { name: 'Cancel' }));
    await expect(args.onUnpair).not.toHaveBeenCalled();
  },
};

export const ConfirmingUnpairsThisDevice: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Unpair' }));

    const alert = within(await body.findByRole('dialog'));

    await userEvent.click(alert.getByRole('button', { name: 'Unpair' }));
    await expect(args.onUnpair).toHaveBeenCalledOnce();
  },
};

// A Server that cannot be reached cannot be told, and the question says it will keep listing this phone.
export const AnUnreachableServerSaysItWillKeepListingThisDevice: Story = {
  args: { server: unreachableServer },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Unpair' }));

    const alert = within(await body.findByRole('dialog'));

    await waitFor(() =>
      expect(alert.getByText(/keep listing this phone/)).toBeVisible(),
    );
  },
};

export const NotFoundOffersTryAgain: Story = {
  args: { server: unreachableServer },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText('Not found')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Try again' }));
    await expect(args.onTryAgain).toHaveBeenCalledOnce();
    await expect(
      canvas.queryByRole('button', { name: 'Pair again' }),
    ).toBeNull();
  },
};

// The Device must say it lost access, not hang: the page names it and offers the one thing that helps.
export const NotAllowedSaysItLostAccessAndOffersPairAgain: Story = {
  args: { server: notAllowedServer },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText('Not allowed')).toBeVisible();
    await expect(canvas.getByText(/no longer knows this phone/)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Pair again' }));
    await expect(args.onPairAgain).toHaveBeenCalledOnce();
    await expect(
      canvas.queryByRole('button', { name: 'Try again' }),
    ).toBeNull();
  },
};

export const ANotShownServerCanBeShown: Story = {
  args: { server: connectedServer },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Show its Sessions' }),
    );
    await expect(args.onShow).toHaveBeenCalledOnce();
  },
};

export const TheOwnServerOffersNoUnpair: Story = {
  args: { server: ownServer },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: 'Unpair' })).toBeNull();
  },
};
