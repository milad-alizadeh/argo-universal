import { Text } from '@repo/kit/primitives/content/text';
import { List, ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import {
  type ErrorToast,
  useErrorToast,
} from '@repo/kit/primitives/overlays/toast';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { View } from 'react-native';
import { SettingsLoading } from '../settings-loading';

export interface AccountRow {
  id: string;
  host: string;
  label: string;
  // The name of the Plugin that signed the Account in.
  provider: string;
}

export type AccountsLoad =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; accounts: AccountRow[] };

export interface AccountListViewProps {
  caption?: string;
  accounts: AccountsLoad;
  onOpenAccount: (accountId: string) => void;
}

export const accountsTitle = 'Accounts';

const loadFailed: ErrorToast = {
  title: 'Could not load Accounts',
  message: 'The Server did not send its Accounts.',
};

// One row per Account: its host, then its label and the Plugin that provides it; each opens the Account's page.
export function AccountListView(
  props: AccountListViewProps,
): React.JSX.Element {
  useErrorToast(props.accounts.status === 'error' ? loadFailed : undefined);

  return (
    <Screen title={accountsTitle} caption={props.caption}>
      <AccountsBody {...props} />
    </Screen>
  );
}

function AccountsBody(props: AccountListViewProps): React.JSX.Element {
  const { accounts } = props;

  // A failed load keeps the loading row: the toast says why, and the query retries when the Connection reopens.
  if (accounts.status !== 'loaded')
    return <SettingsLoading label="Loading Accounts…" />;

  return accounts.accounts.length === 0 ? (
    noAccounts
  ) : (
    <AccountRows {...props} accounts={accounts.accounts} />
  );
}

const footer = 'Each Account is provided by the Plugin named on its row.';

type RowsProps = Pick<AccountListViewProps, 'onOpenAccount'> & {
  accounts: AccountRow[];
};

const accountItem = (
  account: AccountRow,
  onOpenAccount: RowsProps['onOpenAccount'],
): React.JSX.Element => (
  <ListItem
    key={account.id}
    title={account.host}
    subtitle={`${account.label} · ${account.provider}`}
    onPress={() => onOpenAccount(account.id)}
  />
);

const AccountRows = (props: RowsProps): React.JSX.Element => (
  <List appearance="grouped">
    <ListSection footer={footer}>
      {props.accounts.map((account) =>
        accountItem(account, props.onOpenAccount),
      )}
    </ListSection>
  </List>
);

const noAccounts = (
  <View className="gap-6 p-4">
    <Text role="title" accessibilityRole="heading" aria-level={2}>
      No Accounts yet
    </Text>
    <Text role="secondary" tone="muted">
      Sign in from a Plugin's page. Its Account will appear here.
    </Text>
  </View>
);
