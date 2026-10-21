import { sameHost } from '@repo/contracts/plugins';
import type { PluginAccount } from '@repo/contracts/plugins/accounts';
import { CapabilityRefusal } from '../access/capability-refusal';
import type { PluginAccess } from '../access/plugin-access';
import type { PluginValue } from '../protocol/runtime';
import type { PluginCall } from '../services/plugin-calls';
import type { Hop } from '../services/plugin-fetch-response';
import { withCredential } from './account-headers';
import type { AccountProviders } from './account-providers';
import type { PluginAccounts } from './plugin-accounts';

type BorrowOptions = {
  accounts?: PluginAccounts;
  providers?: AccountProviders;
};

type BorrowContext = BorrowOptions & Pick<PluginCall, 'pluginId' | 'projectId'>;

export type BorrowCall = Pick<
  PluginCall,
  'pluginId' | 'projectId' | 'query' | 'resources' | 'network' | 'logCall'
> & { access: PluginAccess };

export type BorrowRequest = { host: string; hop: Hop };

// Selection, Grant checks, provider refresh and sending the credential stay behind this interface.
export async function borrowFetch(
  options: BorrowOptions,
  call: BorrowCall,
  request: BorrowRequest,
): Promise<PluginValue> {
  return sendBorrow(
    call,
    await borrowHop(ownerOf(options, call), request.hop, request.host),
  );
}

async function sendBorrow(
  call: BorrowCall,
  hop: Hop | null,
): Promise<PluginValue> {
  if (!hop) return unavailableBorrow(call.query);
  call.logCall();

  return call.resources.fetch(hop, {
    access: call.access,
    network: call.network,
  });
}

const ownerOf = (options: BorrowOptions, call: BorrowCall): BorrowContext => ({
  ...options,
  pluginId: call.pluginId,
  projectId: call.projectId,
});

function unavailableBorrow(query: boolean | undefined): null {
  if (query) throw new CapabilityRefusal('Account is unavailable');

  return null;
}

// The host check precedes granting, waking the provider, and every network operation.
async function borrowHop(
  call: BorrowContext,
  hop: Hop,
  host: string,
): Promise<Hop | null> {
  if (!sameHost(host, hop.url.host))
    throw new CapabilityRefusal(
      `Account ${host} cannot be sent to ${hop.url.host}`,
    );
  const accounts = call.accounts;

  if (!accounts) return null;

  return chosenHop(call, hop, await accounts.get(host, call.projectId));
}

function chosenHop(
  call: BorrowContext,
  hop: Hop,
  account: PluginAccount | null,
): Promise<Hop | null> {
  if (!account) return Promise.resolve(null);

  return authenticatedHop(call, hop, account);
}

async function authenticatedHop(
  call: BorrowContext,
  hop: Hop,
  account: PluginAccount,
): Promise<Hop | null> {
  if (!(await allowed(call, account))) return null;
  const providers = call.providers;

  if (!providers) return null;

  return credentialHop({ call, hop, account }, await providers.token(account));
}

function credentialHop(
  {
    call,
    hop,
    account,
  }: { call: BorrowContext; hop: Hop; account: PluginAccount },
  credential: { header: string; value: string } | null,
): Hop | null {
  if (!credential) return null;

  return stillGranted(call, account) ? withCredential(hop, credential) : null;
}

async function allowed(
  call: BorrowContext,
  account: PluginAccount,
): Promise<boolean> {
  return (await call.accounts?.allowed(account, call.pluginId)) ?? false;
}

// Recheck after the provider returns: signing out or revoking while it refreshes wins.
function stillGranted(call: BorrowContext, account: PluginAccount): boolean {
  const accounts = call.accounts;

  if (!accounts?.list().some(({ id }) => id === account.id)) return false;

  return accounts
    .grants(account.id)
    .some((grant) => grant.plugin === call.pluginId && grant.allowed);
}
