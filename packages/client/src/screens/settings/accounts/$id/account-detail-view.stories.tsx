import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { AccountDetailView } from './account-detail-view';
import { sharedAccount, unsharedAccount } from './account-detail-view-fixtures';

const meta = {
  title: 'Screens/Settings/Account',
  component: AccountDetailView,
  argTypes: {
    title: { control: 'text' },
    caption: { control: 'text' },
    account: { control: false },
  },
  parameters: { screenPreview: true },
  args: {
    title: 'milad-alizadeh',
    account: sharedAccount,
    onRevoke: action('revoke access'),
    onSignOut: action('sign out'),
    onBack: action('back'),
  },
} satisfies Meta<typeof AccountDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoOtherPlugins: Story = { args: { account: unsharedAccount } };

export const Loading: Story = { args: { account: { status: 'loading' } } };

export const Missing: Story = {
  args: { title: 'acc-gone', account: { status: 'missing' } },
};
