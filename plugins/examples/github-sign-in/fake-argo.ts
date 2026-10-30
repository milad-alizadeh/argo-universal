import type { Argo } from '@argo/plugin-kit';

type Reply = Awaited<ReturnType<Argo['fetch']>>;

type Provided = Parameters<Argo['accounts']['provide']>[2];

type Start = NonNullable<Awaited<ReturnType<Argo['oauth']['start']>>>;

export type World = {
  clientId?: string | null;
  start?: () => Promise<Start | null>;
  result?: { code: string; verifier: string } | null;
  token?: Reply;
  user?: Reply;
};

// A signed-in Account as Argo hands it to the provider handler.
export const account = (id: string): Parameters<Provided>[0] => ({
  id,
  host: 'api.github.com',
  label: 'octocat',
  providedBy: 'github-sign-in',
});

const okStatus = 200;

const deniedStatus = 401;

export const reply = (ok: boolean, body: Record<string, string>): Reply => ({
  ok,
  status: ok ? okStatus : deniedStatus,
  statusText: '',
  headers: {},
  body: JSON.stringify(body),
  truncated: false,
  text: () => Promise.resolve(JSON.stringify(body)),
  json: () => Promise.resolve(body),
});

const started: Start = {
  redirectUri: 'http://127.0.0.1:51789/callback',
  state: 'state-1',
  codeChallenge: 'challenge',
  codeChallengeMethod: 'S256',
};

// What the Plugin asked of Argo, for the tests to read.
type Log = {
  authorize: string[];
  requests: { url: string; body: string | undefined }[];
  added: { host: string; label: string }[];
  secrets: Map<string, string>;
  provided: { host: string; header: string; prefix: string }[];
  handler: Provided | undefined;
};

const oauthOf = (world: World, log: Log): Argo['oauth'] => ({
  start: world.start ?? (() => Promise.resolve(started)),
  await: (_state, url) => {
    log.authorize.push(url);

    return Promise.resolve(
      world.result === undefined
        ? { code: 'code-1', verifier: 'verifier-1' }
        : world.result,
    );
  },
});

type Replies = { user: Reply; token: Reply };

const fetchOf =
  (replies: Replies, log: Log): Argo['fetch'] =>
  (url, init) => {
    log.requests.push({ url, body: init?.body });

    return Promise.resolve(
      url.endsWith('/user') ? replies.user : replies.token,
    );
  };

const accountsOf = (log: Log): Argo['accounts'] => ({
  add: (host, { label }) => {
    log.added.push({ host, label });

    return Promise.resolve('account-1');
  },
  get: () => Promise.resolve(null),
  provide: (host, { header, prefix }, handler) => {
    log.provided.push({ host, header, prefix });
    log.handler = handler;

    return Promise.resolve();
  },
});

const secretsOf = (log: Log): Argo['secrets'] => ({
  get: (id) => Promise.resolve(log.secrets.get(id) ?? null),
  set: (id, value) => {
    log.secrets.set(id, value);

    return Promise.resolve();
  },
  delete: (id) => {
    log.secrets.delete(id);

    return Promise.resolve();
  },
});

const emptyLog = (): Log => ({
  authorize: [],
  requests: [],
  added: [],
  secrets: new Map(),
  provided: [],
  handler: undefined,
});

const repliesOf = (world: World): Replies => ({
  user: world.user ?? reply(true, { login: 'octocat' }),
  token: world.token ?? reply(true, { access_token: 'token-1' }),
});

type Fake = {
  calls: Pick<Argo, 'accounts' | 'oauth' | 'secrets' | 'settings' | 'fetch'>;
  log: Log;
};

// The calls a sign-in makes, faked, with a log of what went through them.
export function fakeArgo(world: World = {}): Fake {
  const log = emptyLog();
  const clientId = world.clientId === undefined ? 'client-1' : world.clientId;

  return {
    log,
    calls: {
      accounts: accountsOf(log),
      oauth: oauthOf(world, log),
      secrets: secretsOf(log),
      settings: { get: () => Promise.resolve(clientId) },
      fetch: fetchOf(repliesOf(world), log),
    },
  };
}
