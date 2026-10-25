import type { Argo } from '@argo/plugin-kit';

export const accountHost = 'api.github.com';

const authorizeUrl = 'https://github.com/login/oauth/authorize';

const tokenUrl = 'https://github.com/login/oauth/access_token';

export type SignInResult =
  | { kind: 'signed-in'; label: string }
  | { kind: 'cancelled' }
  | { kind: 'port-in-use'; message: string }
  | { kind: 'failed'; message: string };

type Calls = Pick<
  Argo,
  'accounts' | 'oauth' | 'secrets' | 'settings' | 'fetch'
>;

type Start = { redirectUri: string; state: string; codeChallenge: string };

type Grant = Start & { clientId: string; code: string; verifier: string };

const form = (fields: Record<string, string>): string =>
  Object.entries(fields)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

const failed = (message: string): SignInResult => ({ kind: 'failed', message });

type Response = Awaited<ReturnType<Calls['fetch']>>;

const bodyOf = (response: Response): Promise<string> =>
  response?.ok ? response.text() : Promise.resolve('null');

// One non-empty string field of GitHub's JSON answer, or null for anything else.
const stringField =
  (field: string) =>
  async (response: Response): Promise<string | null> => {
    const value = Object(JSON.parse(await bodyOf(response)))[field];

    return typeof value === 'string' && value !== '' ? value : null;
  };

// The Plugin exchanges the code itself: Argo only ran the browser and the listener.
const tokenRequest = (grant: Grant): Parameters<Calls['fetch']>[1] => ({
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded',
  },
  body: form({
    client_id: grant.clientId,
    code: grant.code,
    code_verifier: grant.verifier,
    redirect_uri: grant.redirectUri,
  }),
});

function exchange(calls: Calls, grant: Grant): Promise<string | null> {
  return calls
    .fetch(tokenUrl, tokenRequest(grant))
    .then(stringField('access_token'));
}

// GitHub's login names the Account: only the Plugin knows whose token this is.
function loginOf(calls: Calls, token: string): Promise<string | null> {
  return calls
    .fetch(`https://${accountHost}/user`, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
    })
    .then(stringField('login'));
}

function authorizeLocation(clientId: string, start: Start): string {
  return `${authorizeUrl}?${form({
    client_id: clientId,
    redirect_uri: start.redirectUri,
    state: start.state,
    code_challenge: start.codeChallenge,
    code_challenge_method: 'S256',
    scope: 'read:user',
  })}`;
}

// Argo mints the Account id; the token lives in this Plugin's own secrets under it.
async function identify(calls: Calls, token: string): Promise<SignInResult> {
  const label = await loginOf(calls, token);

  if (!label) return failed('GitHub did not say who signed in.');
  const id = await calls.accounts.add(accountHost, { label });

  await calls.secrets.set(id, token);

  return { kind: 'signed-in', label };
}

async function complete(calls: Calls, grant: Grant): Promise<SignInResult> {
  const token = await exchange(calls, grant);

  return token
    ? identify(calls, token)
    : failed('GitHub did not return a token.');
}

async function run(calls: Calls, clientId: string): Promise<SignInResult> {
  const start = await calls.oauth.start();

  if (!start) return failed('Couldn’t start sign-in.');
  const url = authorizeLocation(clientId, start);
  const result = await calls.oauth.await(start.state, url);

  // A denial, the five-minute timeout and a reload all resolve to nothing.
  return result
    ? complete(calls, { ...start, ...result, clientId })
    : { kind: 'cancelled' };
}

// Argo's own message when another program holds the fixed callback port.
const portTaken = (error: Error): boolean => error.message.includes('in use');

function outcome(error: Error): SignInResult {
  return portTaken(error)
    ? { kind: 'port-in-use', message: error.message }
    : failed(error.message);
}

export function createSignIn(calls: Calls): () => Promise<SignInResult> {
  return async () => {
    const clientId = await calls.settings.get('client-id');

    if (typeof clientId !== 'string' || !clientId)
      return failed('Set the OAuth client ID in this Plugin’s settings first.');

    return run(calls, clientId).catch(outcome);
  };
}

/*
 * Other Plugins borrow this Account through Argo: it wakes this handler and sets the header itself.
 * Argo writes the prefix, a space, then the token, so the prefix carries no trailing space.
 */
export function provideAccount(
  argo: Pick<Argo, 'accounts' | 'secrets'>,
): Promise<void> {
  return argo.accounts.provide(
    accountHost,
    { header: 'Authorization', prefix: 'Bearer' },
    (account) => argo.secrets.get(account.id),
  );
}
