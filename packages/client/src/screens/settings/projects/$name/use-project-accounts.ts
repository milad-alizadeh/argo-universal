import type { PluginAccount } from '@repo/contracts/plugins/accounts';
import { errorToast } from '@repo/kit/error-toast';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import { type PluginEntry, usePluginEntries } from '../../plugins/use-plugins';
import type {
  ProjectAccountHost,
  ProjectAccountsProps,
} from './project-detail-accounts';

type Loaded = {
  accounts: PluginAccount[];
  // The Account id this Project chose, per host.
  chosen: Map<string, string | undefined>;
};

// This Project's chosen Account id per host; undefined until the Server has answered for every host.
function useChosenIds(
  projectId: string,
  hosts: string[],
): Map<string, string | undefined> | undefined {
  const trpc = useTRPC();

  const gets = useQueries({
    queries: hosts.map((host) =>
      trpc.plugins.accounts.get.queryOptions({ projectId, host }),
    ),
  });

  if (gets.some((query) => query.isPending)) return undefined;

  return new Map(hosts.map((host, i) => [host, gets[i]?.data?.id]));
}

const hostsOf = (accounts: PluginAccount[] | undefined): string[] => [
  ...new Set(accounts?.map((account) => account.host)),
];

// The Server's Accounts and this Project's choice per host; undefined until the Server has answered.
function useLoadedAccounts(projectId: string): Loaded | undefined {
  const list = useQuery(useTRPC().plugins.accounts.list.queryOptions());
  const chosen = useChosenIds(projectId, hostsOf(list.data));

  return list.data && chosen ? { accounts: list.data, chosen } : undefined;
}

function useChooseAccount(
  projectId: string,
): ProjectAccountsProps['onChooseAccount'] {
  const trpc = useTRPC();
  const cache = useQueryClient();

  const choose = useMutation(
    trpc.plugins.accounts.choose.mutationOptions({
      onSuccess: () =>
        cache.invalidateQueries(trpc.plugins.accounts.get.queryFilter()),
    }),
  );

  useErrorToast(errorToast('Could not choose the Account', choose.error));

  return (host, account) => choose.mutate({ projectId, host, account });
}

const toHosts = (
  { accounts, chosen }: Loaded,
  providerName: (pluginId: string) => string,
): ProjectAccountHost[] =>
  [...chosen].map(([host, id]) => ({
    host,
    chosen: id,
    accounts: accounts
      .filter((account) => account.host === host)
      .map((account) => ({
        id: account.id,
        label: account.label,
        provider: providerName(account.providedBy),
      })),
  }));

const pluginName = (
  plugins: PluginEntry[] | undefined,
  pluginId: string,
): string => {
  const entry = plugins?.find((plugin) => plugin.manifest.id === pluginId);

  return entry ? entry.manifest.name : pluginId;
};

// The Server's Accounts grouped by host, each with the one this Project chose; undefined until the Server has answered.
export function useProjectAccounts(
  projectId: string,
): ProjectAccountsProps | undefined {
  const loaded = useLoadedAccounts(projectId);
  const { plugins } = usePluginEntries();
  const onChooseAccount = useChooseAccount(projectId);

  const providerName = (pluginId: string): string =>
    pluginName(plugins, pluginId);

  return loaded && { hosts: toHosts(loaded, providerName), onChooseAccount };
}
