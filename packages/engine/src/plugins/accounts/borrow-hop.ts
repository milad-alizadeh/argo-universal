import { sameHost } from '@repo/contracts/plugins';
import type { PluginAccount } from '@repo/contracts/plugins/accounts';
import { CapabilityRefusal } from '../access/capability-refusal';
import type { PluginCall } from '../services/plugin-calls';
import type { Hop } from '../services/plugin-fetch-response';

// The host check precedes granting, waking the provider, and every network operation.
export async function borrowHop(
  call: PluginCall,
  hop: Hop,
  host: string,
): Promise<Hop | null> {
  if (!sameHost(host, hop.url.host))
    throw new CapabilityRefusal(
      `Account ${host} cannot be sent to ${hop.url.host}`,
    );
  const accounts = call.options.accounts;

  if (!accounts) return null;

  return chosenHop(call, hop, await accounts.get(host, call.projectId));
}

function chosenHop(
  call: PluginCall,
  hop: Hop,
  account: PluginAccount | null,
): Promise<Hop | null> {
  if (!account) return Promise.resolve(null);

  return authenticatedHop(call, hop, account);
}

async function authenticatedHop(
  call: PluginCall,
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
  }: { call: PluginCall; hop: Hop; account: PluginAccount },
  credential: { header: string; value: string } | null,
): Hop | null {
  if (!credential) return null;

  return stillGranted(call, account) ? withCredential(hop, credential) : null;
}

async function allowed(
  call: PluginCall,
  account: PluginAccount,
): Promise<boolean> {
  return (
    (await call.options.accounts?.allowed(account, call.pluginId)) ?? false
  );
}

// Recheck after the provider returns: signing out or revoking while it refreshes wins.
function stillGranted(call: PluginCall, account: PluginAccount): boolean {
  const accounts = call.options.accounts;

  if (!accounts?.list().some(({ id }) => id === account.id)) return false;

  return accounts
    .grants(account.id)
    .some((grant) => grant.plugin === call.pluginId && grant.allowed);
}

function withCredential(
  hop: Hop,
  credential: { header: string; value: string },
): Hop {
  const headers = Object.fromEntries(
    Object.entries(hop.headers).filter(
      ([name]) => name.toLowerCase() !== credential.header.toLowerCase(),
    ),
  );

  return {
    ...hop,
    headers: { ...headers, [credential.header]: credential.value },
    accountHeader: credential.header,
  };
}
