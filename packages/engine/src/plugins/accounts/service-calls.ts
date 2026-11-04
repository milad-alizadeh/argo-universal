import { CapabilityRefusal } from '../access/capability-refusal';
import type { PluginRequest, PluginValue } from '../protocol/runtime';
import type { PluginCall } from '../services/plugin-calls';
import { allowAccountHeader } from '../services/plugin-fetch';
import type { PluginAccounts } from './plugin-accounts';

type AccountRequest = Extract<PluginRequest, { api: 'accounts' }>;

type OAuthRequest = Extract<PluginRequest, { api: 'oauth' }>;

export async function accountCall(
  call: PluginCall,
  request: AccountRequest,
): Promise<PluginValue> {
  call.resources.assertOpen();
  const accounts = requireAccounts(call);
  const input = request.call;

  if (input.action === 'add')
    return accounts.add(call.pluginId, input.host, input.label);

  if (input.action === 'get') return accounts.get(input.host, call.projectId);

  await providerCall(call, input);

  return null;
}

async function providerCall(
  call: PluginCall,
  input: Extract<AccountRequest['call'], { action: 'provide' | 'provided' }>,
): Promise<void> {
  const providers = call.accounts;

  if (input.action === 'provided') return providers.settle(call, input);
  await requireAccounts(call).requireProvider(call.pluginId, input.host);
  call.resources.assertOpen();
  allowAccountHeader(input.header);
  providers.register(call, input);
}

function requireAccounts(call: PluginCall): PluginAccounts {
  if (!call.options.accounts) throw new Error('Accounts are unavailable');

  return call.options.accounts;
}

/*
 * Only a call that runs for the Server Device starts an exchange. Awaiting one is also allowed when the call
 * names an exchange this worker started there, so a sign-in whose Operation answered at once can still wait
 * for the browser: the exchange's later calls are the starting caller's.
 */
export async function oauthCall(
  call: PluginCall,
  request: OAuthRequest,
): Promise<PluginValue> {
  call.resources.assertOpen();
  const input = request.call;

  if (!call.serverDevice && !startedHere(call, input))
    throw new CapabilityRefusal('OAuth must run on the Server Device');

  return input.action === 'start'
    ? call.oauth.start(call)
    : call.oauth.await(call, input);
}

const startedHere = (
  call: PluginCall,
  input: OAuthRequest['call'],
): boolean => input.action === 'await' && call.oauth.issued(call, input.state);
