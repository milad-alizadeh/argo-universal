import { layoutWidths } from '@repo/kit/each-layout';
import { findToast } from '@repo/kit/mocks/find-toast';
import { settleViewport } from '@repo/kit/settle-viewport';
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
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof AccountListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ListsEachAccountWithItsLabelAndProvider: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'Accounts', level: 1 }),
    ).toBeVisible();

    await expect(canvas.getAllByText(githubAccount.host)).toHaveLength(2);
    await expect(canvas.getByText(linearAccount.host)).toBeVisible();
    await expect(
      canvas.getByText(`${linearAccount.label} · ${linearAccount.provider}`),
    ).toBeVisible();
    await expect(
      canvas.getByText(secondGithubAccount.label, { exact: false }),
    ).toBeVisible();
  },
};

export const ARowOpensItsAccount: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByText(linearAccount.host));
    await expect(args.onOpenAccount).toHaveBeenCalledWith(linearAccount.id);
  },
};

export const SaysWhenThereAreNoAccounts: Story = {
  args: { accounts: { status: 'loaded', accounts: [] } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/No Accounts/)).toBeVisible();
  },
};

export const ShowsALoadErrorAsAToast: Story = {
  args: { accounts: { status: 'error' } },
  play: async ({ canvas }) => {
    await expect(await findToast('Could not load Accounts')).toBeVisible();
    await expect(canvas.getByText('Loading Accounts…')).toBeVisible();
  },
};
