import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { List, ListSection } from '@repo/kit/primitives/lists/list';
import {
  type ErrorToast,
  useErrorToast,
} from '@repo/kit/primitives/overlays/toast';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';

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

// One row per Account, naming its host, its label and the Plugin that provides it; each opens the Account's page.
export function AccountListView(
  props: AccountListViewProps,
): React.JSX.Element {
  useErrorToast(props.accounts.status === 'error' ? loadFailed : undefined);

  return (
    <Screen title={accountsTitle} caption={props.caption}>
      <List appearance="grouped">
        <ListSection footer={footer(props.accounts)}>
          {accountRows(props)}
        </ListSection>
      </List>
    </Screen>
  );
}

const footer = (accounts: AccountsLoad): string | undefined =>
  accounts.status === 'loaded' && accounts.accounts.length > 0
    ? 'Each Account is provided by the Plugin named on its row.'
    : undefined;

// A failed load keeps the loading row: the toast says why, and the query retries when the Connection reopens.
function accountRows(
  props: AccountListViewProps,
): React.JSX.Element | React.JSX.Element[] {
  const { accounts } = props;

  if (accounts.status !== 'loaded') return loadingAccounts;

  return accounts.accounts.length === 0
    ? noAccounts
    : linkRows(props, accounts);
}

const loadingAccounts = <FieldGroup.Value title="Loading Accounts…" value="" />;

// The section's rows as its own children, so the card knows its first and last row.
const linkRows = (
  props: AccountListViewProps,
  loaded: Extract<AccountsLoad, { status: 'loaded' }>,
): React.JSX.Element[] =>
  loaded.accounts.map((account) => (
    <FieldGroup.Link
      key={account.id}
      title={account.host}
      value={`${account.label} · ${account.provider}`}
      onPress={() => props.onOpenAccount(account.id)}
    />
  ));

const noAccounts = (
  <FieldGroup.Value
    title="No Accounts yet. Sign in from a Plugin's page."
    value=""
  />
);
