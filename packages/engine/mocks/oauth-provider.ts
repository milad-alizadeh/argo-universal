import type {
  OAuthFlowArgo,
  OAuthFlowOptions,
} from '@repo/contracts/plugins/oauth-flow-api';

type Reply = Awaited<ReturnType<OAuthFlowArgo['fetch']>>;

type Callback = { code: string; verifier: string } | null;

type Handler = Parameters<OAuthFlowArgo['accounts']['provide']>[2];

type Provided = { host: string; header: { header: string; prefix: string } };

// What the fake saw: authorize URLs opened, token requests, Accounts added, tokens kept and redraws asked for.
type Seen = {
  authorize: string[];
  tokenBodies: (string | undefined)[];
  added: { host: string; label: string }[];
  secrets: Map<string, string>;
  changes: number;
  provided: Provided[];
  handler: Handler | undefined;
};

export type FakeProvider = {
  argo: OAuthFlowArgo;
  seen: Seen;
  browser: PromiseWithResolvers<Callback>;
  failStart: (error: Error) => void;
  // What the provider the flow registered answers a borrow of the Account; nothing until it registered.
  borrow: (id: string) => Promise<string | null>;
};

// The token endpoint's answer, with its JSON body as text.
export const tokenReply = (ok: boolean, body: string): Reply => ({
  ok,
  status: ok ? 200 : 401,
  statusText: '',
  headers: {},
  body,
  truncated: false,
  text: () => Promise.resolve(body),
  json: () => Promise.resolve(JSON.parse(body)),
});

export const redirectUri = 'http://127.0.0.1:51789/callback';

// A service named Linear, signing in the person its token names.
export const linear: OAuthFlowOptions = {
  host: 'api.linear.app',
  authorizeUrl: 'https://linear.app/oauth/authorize',
  tokenUrl: 'https://api.linear.app/oauth/token',
  clientId: 'client-1',
  scopes: ['read', 'write'],
  label: (token) => Promise.resolve(token === 'token-1' ? 'Milad' : null),
};

const started = {
  redirectUri,
  state: 'state-1',
  codeChallenge: 'challenge-1',
  codeChallengeMethod: 'S256' as const,
};

type Opening = { start: () => Promise<typeof started> };

const emptySeen = (): Seen => ({
  authorize: [],
  tokenBodies: [],
  added: [],
  secrets: new Map(),
  changes: 0,
  provided: [],
  handler: undefined,
});

/*
 * A fake provider behind the Plugin calls an OAuth flow makes: Argo's redirect, whose browser the test
 * finishes, the service's token endpoint, and the Accounts and secrets Argo keeps.
 */
export function fakeProvider(...tokens: Reply[]): FakeProvider {
  const browser = Promise.withResolvers<Callback>();
  const seen = emptySeen();
  const opening: Opening = { start: () => Promise.resolve(started) };
  const replies = tokens.length > 0 ? tokens : [defaultToken];

  return {
    argo: fakeArgo({ seen, browser, replies, opening }),
    seen,
    browser,
    failStart: (error) => {
      opening.start = (): Promise<never> => Promise.reject(error);
    },
    borrow: (id) => borrowed(seen, id),
  };
}

const defaultToken = tokenReply(true, '{"access_token":"token-1"}');

// Borrows through the provider the flow registered, as Argo would for any borrowing Plugin.
async function borrowed(seen: Seen, id: string): Promise<string | null> {
  const account = {
    id,
    host: linear.host,
    label: 'Milad',
    providedBy: 'linear',
  };

  return (await seen.handler?.(account)) ?? null;
}

// The token endpoint answers each call with the next scripted reply; the last one repeats.
const nextReply = (replies: Reply[]): Reply =>
  (replies.length > 1 ? replies.shift() : replies[0]) ?? null;

type Fake = {
  seen: Seen;
  browser: PromiseWithResolvers<Callback>;
  replies: Reply[];
  opening: Opening;
};

const fakeOAuth = ({
  seen,
  browser,
  opening,
}: Omit<Fake, 'replies'>): OAuthFlowArgo['oauth'] => ({
  start: () => opening.start(),
  await: (_state, url) => {
    seen.authorize.push(url);

    return browser.promise;
  },
});

const fakeArgo = ({ replies, ...fake }: Fake): OAuthFlowArgo => ({
  oauth: fakeOAuth(fake),
  fetch: (_url, init) => {
    fake.seen.tokenBodies.push(init?.body);

    return Promise.resolve(nextReply(replies));
  },
  accounts: fakeAccounts(fake.seen),
  secrets: fakeSecrets(fake.seen),
  changed: () => {
    fake.seen.changes += 1;
  },
});

const fakeSecrets = ({ secrets }: Seen): OAuthFlowArgo['secrets'] => ({
  get: (id) => Promise.resolve(secrets.get(id) ?? null),
  set: (id, value) => Promise.resolve(void secrets.set(id, value)),
  delete: (id) => Promise.resolve(void secrets.delete(id)),
});

const fakeAccounts = (seen: Seen): OAuthFlowArgo['accounts'] => ({
  add: (host, { label }) => {
    seen.added.push({ host, label });

    return Promise.resolve('account-1');
  },
  get: () => Promise.resolve(null),
  provide: (host, header, handler) => {
    seen.provided.push({ host, header });
    seen.handler = handler;

    return Promise.resolve();
  },
});
