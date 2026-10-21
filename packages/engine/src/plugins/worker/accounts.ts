import { AccountInvocation } from '@repo/contracts/plugins/account-calls';
import { PluginAccount } from '@repo/contracts/plugins/accounts';
import type { Argo } from '@repo/contracts/plugins/argo-api';
import type { PluginRequest } from '../protocol/runtime';

type Handler = Parameters<Argo['accounts']['provide']>[2];

type Send = <T>(request: PluginRequest) => Promise<T>;

type Dispatcher = {
  provide: Argo['accounts']['provide'];
  inbox: (json: string) => void;
};

type Handlers = Map<string, Handler>;

export function accountDispatcher(call: Send): Dispatcher {
  const handlers: Handlers = new Map();

  return {
    provide: registration(call, handlers),
    inbox: (json) => {
      void answer({ call, handlers }, json).catch(() => {});
    },
  };
}

function registration(
  call: Send,
  handlers: Handlers,
): Argo['accounts']['provide'] {
  return async (host, options, handler) => {
    handlers.set(host, handler);
    await call({
      api: 'accounts',
      call: { action: 'provide', host, ...options },
    });
  };
}

async function answer(
  { call, handlers }: { call: Send; handlers: Handlers },
  json: string,
): Promise<void> {
  const { id, account: value } = AccountInvocation.parse(JSON.parse(json));
  const account = PluginAccount.parse(value);
  const token = await tokenOf(handlers, account);
  await call({ api: 'accounts', call: { action: 'provided', id, token } });
}

async function tokenOf(
  handlers: Handlers,
  account: PluginAccount,
): Promise<string | null> {
  const handler = handlers.get(account.host);

  if (!handler) return null;

  return Promise.resolve()
    .then(() => handler(account))
    .catch(() => null);
}
