import type {
  DeviceFlowArgo,
  DeviceFlowOptions,
} from '@repo/contracts/plugins/device-flow-api';

type Fetched = Awaited<ReturnType<DeviceFlowArgo['fetch']>>;

// One answer of the fake service: a status and the JSON body.
export type Reply = { status: number; body: Record<string, string | number> };

// A service named GitHub, whose sign-in names the person `octocat`.
export const service: DeviceFlowOptions = {
  host: 'api.github.com',
  name: 'GitHub',
  clientId: 'client-1',
  scope: 'repo',
  deviceUrl: 'https://github.com/login/device/code',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  label: { url: 'https://api.github.com/user', field: 'login' },
};

export const userUrl = 'https://api.github.com/user';

export const code: Reply = {
  status: 200,
  body: {
    device_code: 'device-1',
    user_code: 'WDJB-MJHT',
    verification_uri: 'https://github.com/login/device',
    expires_in: 900,
    interval: 1,
  },
};

export const token: Reply = { status: 200, body: { access_token: 'token-1' } };

export const user: Reply = { status: 200, body: { login: 'octocat' } };

// A service that cannot be reached: the call rejects.
export const unreachable: Reply = { status: 0, body: {} };

export const pending: Reply = {
  status: 200,
  body: { error: 'authorization_pending' },
};

const answerOf = (reply: Reply): Fetched => ({
  ok: reply.status < 400,
  status: reply.status,
  statusText: '',
  headers: {},
  body: JSON.stringify(reply.body),
  truncated: false,
  text: () => Promise.resolve(JSON.stringify(reply.body)),
  json: () => Promise.resolve(reply.body),
});

export type FakeDevice = {
  argo: DeviceFlowArgo;
  calls: { url: string; body: string | undefined }[];
  added: { host: string; label: string }[];
  secrets: Map<string, string>;
  changes: () => number;
  // What the provider the flow registered answers a borrow of the Account; nothing until it registered.
  borrow: (id: string) => Promise<string | null>;
};

type TokenHandler = Parameters<DeviceFlowArgo['accounts']['provide']>[2];

// The next scripted answer for a URL; the last one repeats.
const nextFor = (
  script: Map<string, Reply[]>,
  url: string,
): Reply | undefined => {
  const replies = script.get(url) ?? [];

  return replies.length > 1 ? replies.shift() : replies[0];
};

type Fetching = DeviceFlowArgo['fetch'];

const fetching =
  (script: Map<string, Reply[]>, calls: FakeDevice['calls']): Fetching =>
  (url, init) => {
    calls.push({ url, body: init?.body });

    return replied(nextFor(script, url));
  };

// No script answers nothing; `unreachable` rejects, as a call that never reached the service does.
function replied(reply: Reply | undefined): Promise<Fetched> {
  if (reply === unreachable) return Promise.reject(new Error('unreachable'));

  return Promise.resolve(reply ? answerOf(reply) : null);
}

const accountsOf = (
  added: FakeDevice['added'],
  handlers: TokenHandler[],
): DeviceFlowArgo['accounts'] => ({
  add: (host, { label }) => {
    added.push({ host, label });

    return Promise.resolve('account-1');
  },
  provide: (_host, _header, handler) => {
    handlers.push(handler);

    return Promise.resolve();
  },
});

const secretsOf = (kept: Map<string, string>): DeviceFlowArgo['secrets'] => ({
  get: (id) => Promise.resolve(kept.get(id) ?? null),
  set: (id, value) => Promise.resolve(void kept.set(id, value)),
});

// Borrows through the provider registered last, as Argo would for any borrowing Plugin.
const borrowing =
  (handlers: TokenHandler[]) =>
  async (id: string): Promise<string | null> => {
    const handler = handlers.at(-1);

    const account = {
      id,
      host: service.host,
      label: 'octocat',
      providedBy: 'plugin-1',
    };

    return handler ? ((await handler(account)) ?? null) : null;
  };

/*
 * The calls a device flow makes, over a service that answers each URL with what the test scripted for it, and
 * the Accounts and secrets Argo keeps.
 */
export function fakeDevice(script: Record<string, Reply[]>): FakeDevice {
  const state = emptyState();

  return {
    argo: argoOf(script, state),
    calls: state.calls,
    added: state.added,
    secrets: state.secrets,
    changes: () => state.changes.count,
    borrow: borrowing(state.handlers),
  };
}

const emptyState = (): FakeState => ({
  calls: [],
  added: [],
  secrets: new Map(),
  handlers: [],
  changes: { count: 0 },
});

type FakeState = {
  calls: FakeDevice['calls'];
  added: FakeDevice['added'];
  secrets: Map<string, string>;
  handlers: TokenHandler[];
  changes: { count: number };
};

const argoOf = (
  script: Record<string, Reply[]>,
  state: FakeState,
): DeviceFlowArgo => ({
  fetch: fetching(new Map(Object.entries(script)), state.calls),
  accounts: accountsOf(state.added, state.handlers),
  secrets: secretsOf(state.secrets),
  changed: () => {
    state.changes.count += 1;
  },
});
