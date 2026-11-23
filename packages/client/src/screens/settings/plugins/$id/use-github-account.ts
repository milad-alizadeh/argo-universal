import type { PluginAccount } from '@repo/contracts/plugins/accounts';
import { useQuery } from '@tanstack/react-query';
import { useTRPCClient } from '#features/connection';
import type { PluginEntry } from '#features/plugins';
import { useScreenFocused } from '#lib/product/navigation/navigation';

const providerId = 'issue-tracker';

const host = 'api.github.com';

const statusOperation = 'githubConnectionStatus';

const statusIntervalMs = 60_000;

export type GitHubAccount = {
  providerId: string;
  page: string;
  connected: boolean;
};

// The GitHub Plugin borrows the Account provided by the Issue tracker.
export function useGitHubAccount(
  pluginId: string,
  plugins: PluginEntry[] | undefined,
  accounts: PluginAccount[] | undefined,
): GitHubAccount | undefined {
  const provider = plugins?.find(({ manifest }) => manifest.id === providerId);

  const page = provider?.manifest.contributes.accounts?.find(
    (account) => account.host === host,
  )?.page;

  const provided = accounts?.filter(
    (account) => account.host === host && account.providedBy === providerId,
  );

  const isGitHub = pluginId === 'github' && page !== undefined;

  const rejected = useGitHubRejection(
    isGitHub ? provider : undefined,
    provided,
  );

  if (!isGitHub || !provided) return undefined;

  return { providerId, page, connected: provided.length > 0 && !rejected };
}

// A call without a Project can borrow the provider's Account when it has exactly one.
function useGitHubRejection(
  provider: PluginEntry | undefined,
  accounts: PluginAccount[] | undefined,
): boolean {
  const client = useTRPCClient();
  const focused = useScreenFocused();
  const accountId = accounts?.length === 1 ? accounts[0]?.id : undefined;

  const canCheck = provider?.manifest.contributes.operations?.some(
    ({ name }) => name === statusOperation,
  );

  const check = useQuery({
    queryKey: ['github-connection-status', accountId],
    enabled:
      focused &&
      accountId !== undefined &&
      provider?.enabled === true &&
      canCheck === true,
    queryFn: async () => {
      const { result } = await client.plugins.run.mutate({
        pluginId: providerId,
        operation: statusOperation,
        args: {},
      });

      if (!result || typeof result !== 'object' || Array.isArray(result))
        throw new Error('GitHub connection status was unavailable.');

      if (result.status === 'disconnected') return true;

      if (result.status === 'connected') return false;

      throw new Error('GitHub connection status was unavailable.');
    },
    retry: false,
    refetchInterval: statusIntervalMs,
  });

  return check.data === true;
}
