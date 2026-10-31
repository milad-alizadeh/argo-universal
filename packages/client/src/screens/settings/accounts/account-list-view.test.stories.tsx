import { findToast } from '@repo/kit/mocks/find-toast';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { AccountListView } from './account-list-view';
import {
  accountRows,
  githubAccount,
  linearAccount,
  secondGithubAccount,
} from './account-list-view-fixtures';

const meta = {
  title: 'Tests/Screens/Settings/Accounts',
  component: AccountListView,
  parameters: { screenPreview: true },
  args: {
    accounts: { status: 'loaded', accounts: accountRows },
    onOpenAccount: fn(),
  },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof AccountListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ListsEachAccountWithItsLabel: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'Accounts', level: 1 }),
    ).toBeVisible();

    await expect(canvas.getAllByText(githubAccount.host)).toHaveLength(2);
    await expect(canvas.getByText(linearAccount.host)).toBeVisible();
    await expect(canvas.getByText(linearAccount.label)).toBeVisible();
    await expect(canvas.getByText(secondGithubAccount.label)).toBeVisible();
  },
};

export const ARowOpensItsAccount: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('link', {
        name: `${linearAccount.host}, ${linearAccount.label}`,
      }),
    );
    await expect(args.onOpenAccount).toHaveBeenCalledWith(linearAccount.id);
  },
};

export const SaysWhenThereAreNoAccounts: Story = {
  args: { accounts: { status: 'loaded', accounts: [] } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/No Accounts/)).toBeVisible();
    // The one-line row says so; the Section's footer says where to sign in, so no line is cut.
    await expect(canvas.getByText(/Sign in from/)).toBeVisible();
  },
};

export const ShowsALoadErrorAsAToast: Story = {
  args: { accounts: { status: 'error' } },
  play: async ({ canvas }) => {
    await expect(await findToast('Could not load Accounts')).toBeVisible();
    await expect(canvas.getByText('Loading Accounts…')).toBeVisible();
  },
};
