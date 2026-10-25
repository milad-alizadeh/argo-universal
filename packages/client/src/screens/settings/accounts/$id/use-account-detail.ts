import type {
  PluginAccount,
  PluginAccountGrant,
} from '@repo/contracts/plugins/accounts';
import { errorToast } from '@repo/kit/error-toast';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import { usePluginNames } from '../use-accounts';
import type { AccountBorrower, AccountDetailLoad } from './account-detail-view';

export interface AccountDetail {
  // The Account's label, or its id until the Account loads.
  title: string;
  account: AccountDetailLoad;
}

const loading: AccountDetailLoad = { status: 'loading' };

type PluginName = (pluginId: string) => string;

interface AccountAnswers {
  accounts: PluginAccount[] | undefined;
  account: PluginAccount | undefined;
  grants: PluginAccountGrant[] | undefined;
}

// A failed load keeps the loading row: the toast says why, and the query retries when the Connection reopens.
function useAccountAnswers(accountId: string): AccountAnswers {
  const trpc = useTRPC();
  const list = useQuery(trpc.plugins.accounts.list.queryOptions());
  const account = list.data?.find((entry) => entry.id === accountId);

  const grants = useQuery({
    ...trpc.plugins.accounts.grants.queryOptions({ id: accountId }),
    enabled: account !== undefined,
  });

  useErrorToast(errorToast('Could not load the Accounts', list.error));
  useErrorToast(
    errorToast('Could not load who uses the Account', grants.error),
  );

  return { accounts: list.data, account, grants: grants.data };
}

export function useAccountDetail(accountId: string): AccountDetail {
  const answers = useAccountAnswers(accountId);
  const pluginName = usePluginNames();

  return {
    title: answers.account ? answers.account.label : accountId,
    account: toAccountLoad(answers, pluginName),
  };
}

function toAccountLoad(
  answers: AccountAnswers,
  pluginName: PluginName,
): AccountDetailLoad {
  if (!answers.accounts) return loading;

  return answers.account
    ? withGrants(answers.account, answers.grants, pluginName)
    : { status: 'missing' };
}

const withGrants = (
  account: PluginAccount,
  grants: PluginAccountGrant[] | undefined,
  pluginName: PluginName,
): AccountDetailLoad =>
  grants ? loadedAccount(account, grants, pluginName) : loading;

// The Plugins whose grant says `allowed`, by name.
const pluginsWhere = (
  grants: PluginAccountGrant[],
  allowed: boolean,
  pluginName: PluginName,
): AccountBorrower[] =>
  grants.flatMap((grant) =>
    grant.allowed === allowed
      ? [{ pluginId: grant.plugin, name: pluginName(grant.plugin) }]
      : [],
  );

// The Plugins allowed to borrow the Account and those refused; the provider is named on its own line.
const loadedAccount = (
  account: PluginAccount,
  grants: PluginAccountGrant[],
  pluginName: PluginName,
): AccountDetailLoad => {
  const others = grants.filter((grant) => grant.plugin !== account.providedBy);

  return {
    status: 'loaded',
    host: account.host,
    provider: pluginName(account.providedBy),
    borrowers: pluginsWhere(others, true, pluginName),
    refused: pluginsWhere(others, false, pluginName),
  };
};

function useGrantChange(): (change: PluginAccountGrant) => void {
  const trpc = useTRPC();
  const cache = useQueryClient();

  const onSuccess = (): Promise<void> =>
    cache.invalidateQueries(trpc.plugins.accounts.grants.queryFilter());

  const grant = useMutation(
    trpc.plugins.accounts.grant.mutationOptions({ onSuccess }),
  );

  useErrorToast(errorToast('Could not change access', grant.error));

  return grant.mutate;
}

// Refuses or allows one Plugin's use of the Account, leaving it signed in for the others; a failure shows one toast.
export function useGrantAccess(
  accountId: string,
  host: string | undefined,
  allowed: boolean,
): (pluginId: string) => void {
  const change = useGrantChange();

  return (plugin) =>
    host !== undefined && change({ host, account: accountId, plugin, allowed });
}

// Once the Server has signed the Account out, its page has nothing left to show.
function useSignedOutRefresh(onSignedOut: () => void): () => Promise<void> {
  const trpc = useTRPC();
  const cache = useQueryClient();

  return async () => {
    onSignedOut();
    await cache.invalidateQueries(trpc.plugins.accounts.pathFilter());
  };
}

// Signs the Account out on the Server, then leaves its page; a failure shows one toast.
export function useSignOut(
  accountId: string,
  onSignedOut: () => void,
): () => void {
  const onSuccess = useSignedOutRefresh(onSignedOut);

  const signOut = useMutation(
    useTRPC().plugins.accounts.signOut.mutationOptions({ onSuccess }),
  );

  useErrorToast(errorToast('Could not sign out', signOut.error));

  return () => signOut.mutate({ id: accountId });
}
