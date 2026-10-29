import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
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

const accountsTitle = 'Accounts';

const loadFailed: ErrorToast = {
  title: 'Could not load Accounts',
  message: 'The Server did not send its Accounts.',
};

// One row per Account in one card: its host, then its label; each opens the Account's page.
export function AccountListView(
  props: AccountListViewProps,
): React.JSX.Element {
  useErrorToast(props.accounts.status === 'error' ? loadFailed : undefined);

  return (
    <Screen title={accountsTitle} caption={props.caption}>
      <FieldGroup>
        <FieldGroup.Section>{accountRows(props)}</FieldGroup.Section>
      </FieldGroup>
    </Screen>
  );
}

/*
 * The section's rows as its own children, so the card knows its first and last row. A failed load keeps the loading
 * row: the toast says why, and the query retries when the Connection reopens.
 */
function accountRows({
  accounts,
  onOpenAccount,
}: AccountListViewProps): React.JSX.Element | React.JSX.Element[] {
  if (accounts.status !== 'loaded') return loadingAccounts;

  if (accounts.accounts.length === 0) return noAccounts;

  return accounts.accounts.map((account) => accountRow(account, onOpenAccount));
}

const loadingAccounts = <FieldGroup.Value title="Loading Accounts…" value="" />;

const noAccounts = (
  <FieldGroup.Value
    title="No Accounts yet. Sign in from a Plugin's page."
    value=""
  />
);

const accountRow = (
  account: AccountRow,
  onOpenAccount: AccountListViewProps['onOpenAccount'],
): React.JSX.Element => (
  <FieldGroup.Link
    key={account.id}
    title={account.host}
    value={account.label}
    onPress={() => onOpenAccount(account.id)}
  />
);
