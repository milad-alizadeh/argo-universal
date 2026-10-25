import type { PluginAccount } from '@repo/contracts/plugins/accounts';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import { usePluginEntries } from '../plugins/use-plugins';
import type { AccountRow, AccountsLoad } from './account-list-view';

export type { AccountRow };

// Each Plugin's name by id, falling back to the id while the Plugin list loads or if it has been removed.
export function usePluginNames(): (pluginId: string) => string {
  const { plugins } = usePluginEntries();

  const names = new Map(
    plugins?.map((entry) => [entry.manifest.id, entry.manifest.name]),
  );

  return (pluginId) => names.get(pluginId) ?? pluginId;
}

const toAccountRow =
  (pluginName: (pluginId: string) => string) =>
  (account: PluginAccount): AccountRow => ({
    id: account.id,
    host: account.host,
    label: account.label,
    provider: pluginName(account.providedBy),
  });

export function useAccountsLoad(): AccountsLoad {
  const { data, isError } = useQuery(
    useTRPC().plugins.accounts.list.queryOptions(),
  );

  const pluginName = usePluginNames();

  if (data)
    return { status: 'loaded', accounts: data.map(toAccountRow(pluginName)) };

  return isError ? { status: 'error' } : { status: 'loading' };
}
