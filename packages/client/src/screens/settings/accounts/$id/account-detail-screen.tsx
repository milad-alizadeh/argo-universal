import type * as React from 'react';
import { useServerPageCaption } from '#features/settings';
import { useNavigate } from '#lib/product/navigation/navigation';
import {
  AccountDetailView,
  type AccountDetailViewProps,
} from './account-detail-view';
import { useAccountDetail, useRevoke, useSignOut } from './use-account-detail';

export interface AccountDetailScreenProps {
  accountId: string;
}

function useAccountDetailProps(accountId: string): AccountDetailViewProps {
  const navigate = useNavigate();
  const { title, account } = useAccountDetail(accountId);
  const back = (): void => navigate('/settings/accounts');
  const host = account.status === 'loaded' ? account.host : undefined;

  return {
    title,
    caption: useServerPageCaption(),
    account,
    onRevoke: useRevoke(accountId, host),
    onSignOut: useSignOut(accountId, back),
    onBack: back,
  };
}

export function AccountDetailScreen({
  accountId,
}: AccountDetailScreenProps): React.JSX.Element {
  return <AccountDetailView {...useAccountDetailProps(accountId)} />;
}
