import type * as React from 'react';
import { useNavigate } from '#lib/product/navigation/navigation';
import {
  AccountDetailView,
  type AccountDetailViewProps,
} from './account-detail-view';
import {
  useAccountDetail,
  useGrantAccess,
  useSignOut,
} from './use-account-detail';

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
    account,
    onRevoke: useGrantAccess(accountId, host, false),
    onAllow: useGrantAccess(accountId, host, true),
    onSignOut: useSignOut(accountId, back),
    onBack: back,
  };
}

export function AccountDetailScreen({
  accountId,
}: AccountDetailScreenProps): React.JSX.Element {
  return <AccountDetailView {...useAccountDetailProps(accountId)} />;
}
