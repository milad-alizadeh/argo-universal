import type * as React from 'react';
import { useNavigate } from '#lib/product/navigation/navigation';
import { AccountListView } from './account-list-view';
import { useAccountsLoad } from './use-accounts';

export function AccountListScreen(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <AccountListView
      accounts={useAccountsLoad()}
      onOpenAccount={(accountId) => navigate(`/settings/accounts/${accountId}`)}
    />
  );
}
