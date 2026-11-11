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
};

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
    const reply = nextFor(script, url);

    return Promise.resolve(reply ? answerOf(reply) : null);
  };

const accountsOf = (
  added: FakeDevice['added'],
): DeviceFlowArgo['accounts'] => ({
  add: (host, { label }) => {
    added.push({ host, label });

    return Promise.resolve('account-1');
  },
  provide: () => Promise.resolve(),
});

const secretsOf = (kept: Map<string, string>): DeviceFlowArgo['secrets'] => ({
  get: (id) => Promise.resolve(kept.get(id) ?? null),
  set: (id, value) => Promise.resolve(void kept.set(id, value)),
});

/*
 * The calls a device flow makes, over a service that answers each URL with what the test scripted for it, and
 * the Accounts and secrets Argo keeps.
 */
export function fakeDevice(script: Record<string, Reply[]>): FakeDevice {
  const calls: FakeDevice['calls'] = [];
  const added: FakeDevice['added'] = [];
  const secrets = new Map<string, string>();
  const changes = { count: 0 };

  const argo: DeviceFlowArgo = {
    fetch: fetching(new Map(Object.entries(script)), calls),
    accounts: accountsOf(added),
    secrets: secretsOf(secrets),
    changed: () => {
      changes.count += 1;
    },
  };

  return { argo, calls, added, secrets, changes: () => changes.count };
}
