import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { AccountListView } from './account-list-view';
import { accountRows } from './account-list-view-fixtures';

const meta = {
  title: 'Screens/Settings/Accounts',
  component: AccountListView,
  argTypes: {
    accounts: { control: false },
  },
  parameters: { screenPreview: true },
  args: {
    accounts: { status: 'loaded', accounts: accountRows },
    onOpenAccount: action('open Account'),
  },
} satisfies Meta<typeof AccountListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoAccounts: Story = {
  args: { accounts: { status: 'loaded', accounts: [] } },
};

export const Loading: Story = { args: { accounts: { status: 'loading' } } };

export const LoadError: Story = { args: { accounts: { status: 'error' } } };
