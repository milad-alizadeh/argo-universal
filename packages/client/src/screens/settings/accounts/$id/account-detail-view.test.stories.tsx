import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { AccountDetailView } from './account-detail-view';
import {
  issuesBorrower,
  pullRequestsBorrower,
  refusedAccount,
  sharedAccount,
  unsharedAccount,
} from './account-detail-view-fixtures';
import { signOutCopy } from './account-sign-out-alert';

const signOutName = 'Sign out';

const body = within(document.body);

const openAlert = async (): Promise<ReturnType<typeof within>> =>
  within(await body.findByRole('dialog', { name: signOutCopy.title }));

const meta = {
  title: 'Tests/Screens/Settings/Account',
  component: AccountDetailView,
  parameters: { screenPreview: true },
  args: {
    title: 'milad-alizadeh',
    account: sharedAccount,
    onRevoke: fn(),
    onAllow: fn(),
    onSignOut: fn(),
  },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof AccountDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShowsHostProviderAndBorrowers: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Host')).toBeVisible();
    await expect(canvas.getByText(sharedAccount.host)).toBeVisible();
    await expect(canvas.getByText(sharedAccount.provider)).toBeVisible();
    await expect(
      canvas.getByRole('switch', { name: issuesBorrower.name }),
    ).toBeChecked();
    await expect(
      canvas.getByRole('switch', { name: pullRequestsBorrower.name }),
    ).toBeChecked();
  },
};

export const TurningAPluginOffRevokesItsAccess: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('switch', { name: issuesBorrower.name }),
    );
    await expect(args.onRevoke).toHaveBeenCalledOnce();
    await expect(args.onRevoke).toHaveBeenCalledWith(issuesBorrower.pluginId);
    await expect(args.onSignOut).not.toHaveBeenCalled();
  },
};

export const TurningARefusedPluginOnAllowsItAgain: Story = {
  args: { account: refusedAccount },
  play: async ({ args, canvas, userEvent }) => {
    const refused = canvas.getByRole('switch', {
      name: pullRequestsBorrower.name,
    });

    await expect(refused).not.toBeChecked();
    await userEvent.click(refused);
    await expect(args.onAllow).toHaveBeenCalledWith(
      pullRequestsBorrower.pluginId,
    );
    await expect(args.onRevoke).not.toHaveBeenCalled();
  },
};

export const SaysWhenNoOtherPluginUsesIt: Story = {
  args: { account: unsharedAccount },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/No other Plugins/)).toBeVisible();
    await expect(canvas.queryByRole('switch')).toBeNull();
  },
};

export const SignOutAsksFirstNamingWhoLosesAccess: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(
      canvas.getByText(/Sign out also removes access for/),
    ).toBeVisible();
    await expect(body.queryByRole('dialog')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: signOutName }));

    const alert = await openAlert();
    const message = await alert.findByText(/provides this Account/);
    await waitFor(() => expect(message).toBeVisible());

    // The providing Plugin comes first, then each Plugin that loses access.
    const text = message.textContent ?? '';

    const names = [
      sharedAccount.provider,
      issuesBorrower.name,
      pullRequestsBorrower.name,
    ];

    const positions = names.map((name) => text.lastIndexOf(name));
    await expect(text.indexOf(sharedAccount.provider)).toBe(0);
    await expect(positions).toEqual([...positions].sort((a, b) => a - b));

    for (const position of positions)
      await expect(position).toBeGreaterThan(-1);

    await expect(args.onSignOut).not.toHaveBeenCalled();
  },
};

export const CancelKeepsTheAccount: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: signOutName }));
    const alert = await openAlert();
    await userEvent.click(alert.getByRole('button', { name: 'Cancel' }));
    await expect(args.onSignOut).not.toHaveBeenCalled();
  },
};

export const ConfirmingSignsOut: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: signOutName }));
    const alert = await openAlert();
    await userEvent.click(alert.getByRole('button', { name: signOutName }));
    await expect(args.onSignOut).toHaveBeenCalledOnce();
  },
};

export const ShowsLoadingUntilTheServerAnswers: Story = {
  args: { account: { status: 'loading' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Loading the Account…')).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: signOutName }),
    ).toBeNull();
  },
};
