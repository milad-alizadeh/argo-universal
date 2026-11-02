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

    await waitFor(() =>
      expect(alert.getByText(/loses access straight away/)).toBeVisible(),
    );
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

// Nothing is wrong with the pairing of a computer that is only asleep, so the page says when it last answered.
export const SaysWhenItLastAnsweredAndWhenItWasPaired: Story = {
  args: { server: unreachableServer },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Today, 09:12')).toBeVisible();
    await expect(canvas.getByText('3 October')).toBeVisible();
  },
};

// The own Server is never paired with, so the page has no times to say and leaves the rows out.
export const LeavesOutTimesItDoesNotHave: Story = {
  args: { server: ownServer },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('Last connected')).toBeNull();
    await expect(canvas.queryByText('Paired')).toBeNull();
  },
};

// A Server paired before times were kept says Unknown rather than hiding the rows.
export const SaysUnknownForTimesItDidNotKeep: Story = {
  args: {
    server: {
      ...unreachableServer,
      lastConnected: 'Unknown',
      paired: 'Unknown',
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText('Unknown')).toHaveLength(2);
  },
};
