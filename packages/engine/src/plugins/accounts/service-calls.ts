import { CapabilityRefusal } from '../access/capability-refusal';
import type { PluginRequest, PluginValue } from '../protocol/runtime';
import type { PluginCall } from '../services/plugin-calls';
import { allowAccountHeader } from '../services/plugin-fetch';
import type { AccountProviders } from './account-providers';
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
  const providers = requireProviders(call);

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

function requireProviders(call: PluginCall): AccountProviders {
  if (!call.providers) throw new Error('Account providers are unavailable');

  return call.providers;
}

export async function oauthCall(
  call: PluginCall,
  request: OAuthRequest,
): Promise<PluginValue> {
  call.resources.assertOpen();

  if (!call.serverDevice)
    throw new CapabilityRefusal('OAuth must run on the Server Device');

  return request.call.action === 'start'
    ? call.oauth.start(call)
    : call.oauth.await(call, request.call);
}
