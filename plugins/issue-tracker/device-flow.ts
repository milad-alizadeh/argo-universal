import type { Argo } from '@argo/plugin-kit';
import { githubHost } from './github-api';
import { githubClientId } from './github-client-id';

type Calls = Pick<Argo, 'fetch' | 'accounts' | 'secrets'>;

const codeUrl = 'https://github.com/login/device/code';

const tokenUrl = 'https://github.com/login/oauth/access_token';

const deviceGrant = 'urn:ietf:params:oauth:grant-type:device_code';

// `repo` reads and changes the Issues of private repositories, which a Project often is.
const scope = 'repo';

// GitHub asks a client that polls too fast to wait this much longer each time (RFC 8628).
const slowDownMs = 5000;

// What the sign-in page shows as the flow goes: the code to enter, then how it ended.
export type FlowStep =
  | { kind: 'requesting' }
  | { kind: 'code'; userCode: string; verificationUri: string }
  | { kind: 'signed-in'; label: string }
  | { kind: 'denied' }
  | { kind: 'expired' }
  | { kind: 'failed'; message: string };

export type FlowRun = {
  // A 401 means the Account exists and its token is dead: rewrite that token instead of adding a second Account.
  reauthorize: boolean;
  show: (step: FlowStep) => void;
  cancelled: () => boolean;
};

// The Account id a borrow last reached, recorded as the provider hands out its token.
export type Borrowed = { id: string | null };

type Fields = Record<string, string>;

const form = (fields: Fields): string =>
  Object.entries(fields)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

type Reply = Record<string, unknown>;

// GitHub answers a form post with JSON when asked to, and with 200 even for "still waiting".
async function post(calls: Calls, url: string, fields: Fields): Promise<Reply> {
  const response = await calls.fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: form(fields),
  });

  if (!response) throw new Error('GitHub could not be reached.');

  return Object(JSON.parse(await response.text())) as Reply;
}

const text = (reply: Reply, key: string): string | null => {
  const value = reply[key];

  return typeof value === 'string' && value !== '' ? value : null;
};

const seconds = (reply: Reply, key: string, fallback: number): number => {
  const value = reply[key];

  return typeof value === 'number' && value >= 0 ? value : fallback;
};

type Device = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  intervalMs: number;
  expiresAt: number;
};

function deviceOf(reply: Reply, now: number): Device | string {
  const deviceCode = text(reply, 'device_code');
  const userCode = text(reply, 'user_code');
  const verificationUri = text(reply, 'verification_uri');

  if (!deviceCode || !userCode || !verificationUri)
    return text(reply, 'error_description') ?? 'GitHub sent no sign-in code.';

  return {
    deviceCode,
    userCode,
    verificationUri,
    intervalMs: seconds(reply, 'interval', 5) * 1000,
    expiresAt: now + seconds(reply, 'expires_in', 900) * 1000,
  };
}

const sleep = (ms: number): Promise<void> =>
  new Promise((done) => setTimeout(done, ms));

type Poll =
  | { kind: 'token'; token: string }
  | { kind: 'wait'; intervalMs: number }
  | Exclude<FlowStep, { kind: 'requesting' | 'code' | 'signed-in' }>;

const failures = {
  access_denied: { kind: 'denied' },
  expired_token: { kind: 'expired' },
} as const;

function pollOutcome(reply: Reply, intervalMs: number): Poll {
  const token = text(reply, 'access_token');

  if (token) return { kind: 'token', token };

  const error = text(reply, 'error');

  if (error === 'authorization_pending') return { kind: 'wait', intervalMs };

  if (error === 'slow_down')
    return { kind: 'wait', intervalMs: intervalMs + slowDownMs };

  if (error === 'access_denied' || error === 'expired_token')
    return failures[error];

  return {
    kind: 'failed',
    message: text(reply, 'error_description') ?? 'GitHub refused the sign-in.',
  };
}

// Asks for the token at GitHub's pace until the person answers, the code runs out or the page stops waiting.
async function awaitToken(
  calls: Calls,
  device: Device,
  run: FlowRun,
): Promise<Poll> {
  let intervalMs = device.intervalMs;

  while (!run.cancelled()) {
    await sleep(intervalMs);

    if (run.cancelled()) break;

    if (Date.now() > device.expiresAt) return { kind: 'expired' };

    const polled = pollOutcome(
      await post(calls, tokenUrl, {
        client_id: githubClientId,
        device_code: device.deviceCode,
        grant_type: deviceGrant,
      }),
      intervalMs,
    );

    if (polled.kind !== 'wait') return polled;

    intervalMs = polled.intervalMs;
  }

  return { kind: 'failed', message: 'Sign-in was cancelled.' };
}

// GitHub's login names the Account: only the Plugin knows whose token this is.
async function loginOf(calls: Calls, token: string): Promise<string> {
  const response = await calls.fetch(`https://${githubHost}/user`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
  });

  const login = Object(JSON.parse((await response?.text()) ?? 'null')).login;

  if (typeof login !== 'string' || login === '')
    throw new Error('GitHub did not say who signed in.');

  return login;
}

// Argo mints the Account id; the token lives in this Plugin's own secrets under it.
async function keep(
  calls: Calls,
  borrowed: Borrowed,
  { token, reauthorize }: { token: string; reauthorize: boolean },
): Promise<string> {
  const label = await loginOf(calls, token);

  const id =
    reauthorize && borrowed.id
      ? borrowed.id
      : await calls.accounts.add(githubHost, { label });

  await calls.secrets.set(id, token);

  return label;
}

async function finish(
  calls: Calls,
  borrowed: Borrowed,
  { token, run }: { token: string; run: FlowRun },
): Promise<FlowStep> {
  const label = await keep(calls, borrowed, {
    token,
    reauthorize: run.reauthorize,
  });

  return { kind: 'signed-in', label };
}

async function authorize(
  calls: Calls,
  borrowed: Borrowed,
  run: FlowRun,
): Promise<FlowStep> {
  const device = deviceOf(
    await post(calls, codeUrl, { client_id: githubClientId, scope }),
    Date.now(),
  );

  if (typeof device === 'string') return { kind: 'failed', message: device };

  run.show({
    kind: 'code',
    userCode: device.userCode,
    verificationUri: device.verificationUri,
  });

  const polled = await awaitToken(calls, device, run);

  return polled.kind === 'token'
    ? finish(calls, borrowed, { token: polled.token, run })
    : (polled as FlowStep);
}

/*
 * GitHub's device flow (RFC 8628): the page shows a code, the person enters it at github.com/login/device on any
 * device, and the Plugin polls for the token. Nothing here needs the Server Device, a callback port or a secret.
 */
export async function runDeviceFlow(
  calls: Calls,
  borrowed: Borrowed,
  run: FlowRun,
): Promise<void> {
  if (githubClientId === '') {
    run.show({ kind: 'failed', message: 'GitHub sign-in is not set up yet.' });

    return;
  }

  run.show({ kind: 'requesting' });

  try {
    const step = await authorize(calls, borrowed, run);

    if (!run.cancelled()) run.show(step);
  } catch (cause) {
    if (!run.cancelled())
      run.show({
        kind: 'failed',
        message: cause instanceof Error ? cause.message : String(cause),
      });
  }
}
