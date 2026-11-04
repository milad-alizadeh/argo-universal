import type {
  OAuthFlowArgo,
  OAuthFlowOptions,
  OAuthFlowPattern,
  OAuthFlowState,
} from '@repo/contracts/plugins/oauth-flow-api';

type Started = NonNullable<Awaited<ReturnType<OAuthFlowArgo['oauth']['start']>>>;

type Grant = Started & { clientId: string; code: string; verifier: string };

// The one sign-in a flow holds, and the attempt whose answers still count.
type Held = { state: OAuthFlowState; attempt: symbol | null };

// What one attempt reaches: the Plugin's calls, the service, and whether it is still the current one.
type Attempt = {
  argo: OAuthFlowArgo;
  options: OAuthFlowOptions;
  live: () => boolean;
  settle: (state: OAuthFlowState) => OAuthFlowState;
};

type Given = Omit<Attempt, 'live' | 'settle'>;

const idle: OAuthFlowState = { kind: 'idle' };

const failed = (message: string): OAuthFlowState => ({
  kind: 'failed',
  reason: 'failed',
  message,
});

const bearer = { header: 'Authorization', prefix: 'Bearer' };

const form = (fields: Record<string, string>): string =>
  Object.entries(fields)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

/*
 * A kit pattern on the open `argo.oauth`, `argo.fetch`, `argo.accounts` and `argo.secrets` calls: start a
 * sign-in, wait for the browser, exchange the code for a token, add the Account and keep its token, saying
 * `argo.changed()` at each step so the pages that draw the state redraw.
 */
export const oauthFlow: OAuthFlowPattern = (argo, options) => {
  const held: Held = { state: idle, attempt: null };

  return Object.freeze({
    state: () => held.state,
    start: () => start(held, { argo, options }),
    cancel: () => cancel(held, argo),
    provide: () => provide(argo, options),
  });
};

// Each change of state is said, so the pages that draw it redraw.
const settling =
  (held: Held, argo: OAuthFlowArgo) =>
  (state: OAuthFlowState): OAuthFlowState => {
    held.state = state;
    argo.changed();

    return state;
  };

// A new attempt replaces the one before, whose answers then change nothing.
function current(held: Held, given: Given): Attempt {
  const mine = Symbol('attempt');
  const live = (): boolean => held.attempt === mine;
  const settle = settling(held, given.argo);

  held.attempt = mine;

  return {
    ...given,
    live,
    settle: (state) => (live() ? settle(state) : held.state),
  };
}

// Answers the state once the browser is open, or why it could not be.
async function start(held: Held, given: Given): Promise<OAuthFlowState> {
  const attempt = current(held, given);

  attempt.settle({ kind: 'waiting' });
  await opened(attempt).catch((error: unknown) =>
    attempt.settle(refused(error)),
  );

  return held.state;
}

// Once Argo listens, the flow waits for the browser on its own, past the call that started it.
async function opened(attempt: Attempt): Promise<void> {
  const clientId = await clientIdOf(attempt.options);

  if (!clientId) {
    attempt.settle(failed('This Plugin has no OAuth client ID yet.'));

    return;
  }

  const started = await attempt.argo.oauth.start();

  if (!started) attempt.settle(failed('Couldn’t start sign-in.'));
  else
    void finished(attempt, { ...started, clientId }).then(
      attempt.settle,
      (error: unknown) => attempt.settle(refused(error)),
    );
}

async function clientIdOf(options: OAuthFlowOptions): Promise<string | null> {
  const { clientId } = options;
  const value = typeof clientId === 'function' ? await clientId() : clientId;

  return value || null;
}

// Argo's own message when another program holds the fixed callback port.
function refused(error: unknown): OAuthFlowState {
  const message = error instanceof Error ? error.message : String(error);

  return message.includes('in use')
    ? { kind: 'failed', reason: 'port-in-use', message }
    : failed(message);
}

type Waiting = Started & { clientId: string };

// A denial, the five-minute timeout and a newer sign-in resolve to nothing, which leaves the flow idle.
async function finished(
  attempt: Attempt,
  waiting: Waiting,
): Promise<OAuthFlowState> {
  const url = authorizeLocation(attempt.options, waiting);
  const result = await attempt.argo.oauth.await(waiting.state, url);

  // A cancelled sign-in adds no Account, even when the person finished in the browser.
  if (!attempt.live()) return idle;

  return result ? signedIn(attempt, { ...waiting, ...result }) : idle;
}

function authorizeLocation(options: OAuthFlowOptions, start: Waiting): string {
  const scope = options.scopes?.join(' ');

  return `${options.authorizeUrl}?${form({
    response_type: 'code',
    client_id: start.clientId,
    redirect_uri: start.redirectUri,
    state: start.state,
    code_challenge: start.codeChallenge,
    code_challenge_method: start.codeChallengeMethod,
    ...(scope && { scope }),
  })}`;
}

// Argo mints the Account id; the token lives in the Plugin's own secrets under it.
async function signedIn(
  { argo, options }: Attempt,
  grant: Grant,
): Promise<OAuthFlowState> {
  const token = await exchange(argo, options, grant);

  if (!token) return failed('The service did not return a token.');

  const label = await options.label(token);

  if (!label) return failed('The service did not say who signed in.');

  const id = await argo.accounts.add(options.host, { label });

  await argo.secrets.set(id, token);

  return { kind: 'signed-in', label };
}

// The Plugin exchanges the code itself, as a public client with its PKCE verifier (RFC 6749, RFC 7636).
async function exchange(
  argo: OAuthFlowArgo,
  options: OAuthFlowOptions,
  grant: Grant,
): Promise<string | null> {
  const response = await argo.fetch(options.tokenUrl, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: form({
      grant_type: 'authorization_code',
      client_id: grant.clientId,
      code: grant.code,
      code_verifier: grant.verifier,
      redirect_uri: grant.redirectUri,
    }),
  });

  if (!response?.ok) return null;

  return (options.readToken ?? accessToken)(jsonOf(await response.text()));
}

// A token endpoint that answers anything but JSON answers no token.
function jsonOf(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function accessToken(answer: unknown): string | null {
  const token: unknown = Object(answer).access_token;

  return typeof token === 'string' && token !== '' ? token : null;
}

function cancel(held: Held, argo: OAuthFlowArgo): OAuthFlowState {
  held.attempt = null;

  return settling(held, argo)(idle);
}

// A borrower's request gets the kept token in the header the flow names; Argo sets it.
const provide = (
  argo: OAuthFlowArgo,
  options: OAuthFlowOptions,
): Promise<void> =>
  argo.accounts.provide(options.host, options.header ?? bearer, (account) =>
    argo.secrets.get(account.id),
  );
