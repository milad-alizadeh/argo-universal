import type { Argo } from '@argo/plugin-kit';

type Calls = Pick<Argo, 'fetch' | 'changed'> & {
  accounts: Pick<Argo['accounts'], 'add'>;
  secrets: Pick<Argo['secrets'], 'set'>;
};

// One service's device flow (RFC 8628): the person enters a code on any device, and the Plugin polls for the token.
export type DeviceFlowOptions = Readonly<{
  host: string;
  name: string;
  clientId: string;
  scope?: string;
  deviceUrl: string;
  tokenUrl: string;
  // Who the token signs in: the `field` of the JSON `url` answers when it is called with the token.
  label: Readonly<{ url: string; field: string }>;
}>;

export type DeviceFlowEnd = 'denied' | 'expired' | 'failed';

export type DeviceFlowState =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | {
      kind: 'code';
      userCode: string;
      verificationUri: string;
      // When the service stops taking the code, and how long it gave, for a countdown.
      expiresAt: number;
      lifetimeMs: number;
    }
  | { kind: 'signed-in'; label: string }
  | { kind: 'ended'; end: DeviceFlowEnd; message: string };

export type DeviceFlow = Readonly<{
  state: () => DeviceFlowState;
  // Asks for a code and answers once it is shown, or why it could not be.
  start: () => Promise<DeviceFlowState>;
  cancel: () => DeviceFlowState;
}>;

type Reply = Record<string, unknown>;

const deviceGrant = 'urn:ietf:params:oauth:grant-type:device_code';

const slowDownMs = 5000;

const msPerSecond = 1000;

const idle: DeviceFlowState = { kind: 'idle' };

const text = (reply: Reply, key: string): string | null => {
  const value = reply[key];

  return typeof value === 'string' && value !== '' ? value : null;
};

const seconds = (reply: Reply, key: string, fallback: number): number => {
  const value = reply[key];

  return typeof value === 'number' && value >= 0 ? value : fallback;
};

const form = (fields: Record<string, string>): string =>
  Object.entries(fields)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

const ended = (end: DeviceFlowEnd, message: string): DeviceFlowState => ({
  kind: 'ended',
  end,
  message,
});

async function postForm(
  calls: Calls,
  url: string,
  fields: Record<string, string>,
): Promise<Reply> {
  const response = await calls.fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: form(fields),
  });

  return response ? parsed(await response.text()) : {};
}

function parsed(body: string): Reply {
  try {
    return Object(JSON.parse(body));
  } catch {
    return {};
  }
}

// What one attempt reaches: the Plugin's calls, the service, and whether it is still the current one.
type Attempt = {
  calls: Calls;
  options: DeviceFlowOptions;
  live: () => boolean;
  settle: (state: DeviceFlowState) => DeviceFlowState;
};

type Device = { code: string; intervalMs: number; expiresAt: number };

const sleep = (ms: number): Promise<void> =>
  new Promise((done) => setTimeout(done, ms));

// The token the service gave, or the state that ends the sign-in.
type Polled =
  | { kind: 'token'; token: string }
  | { kind: 'wait'; slower: boolean }
  | { kind: 'ended'; state: DeviceFlowState };

const endings: Record<string, DeviceFlowEnd> = {
  access_denied: 'denied',
  expired_token: 'expired',
};

const endOf = ({ name }: DeviceFlowOptions, reply: Reply): DeviceFlowState => {
  const code = text(reply, 'error') ?? '';
  const end = endings[code] ?? 'failed';

  return ended(end, text(reply, 'error_description') ?? messages(name)[end]);
};

const messages = (name: string): Record<DeviceFlowEnd, string> => ({
  denied: `You turned the request down on ${name}.`,
  expired: `${name} codes run out. Ask for a new one.`,
  failed: `${name} refused the sign-in.`,
});

async function poll({ calls, options }: Attempt, device: Device): Promise<Polled> {
  const reply = await postForm(calls, options.tokenUrl, {
    client_id: options.clientId,
    device_code: device.code,
    grant_type: deviceGrant,
  });

  const token = text(reply, 'access_token');

  if (token) return { kind: 'token', token };

  const waiting = ['authorization_pending', 'slow_down'].includes(
    text(reply, 'error') ?? '',
  );

  return waiting
    ? { kind: 'wait', slower: reply.error === 'slow_down' }
    : { kind: 'ended', state: endOf(options, reply) };
}

async function labelOf(
  { calls, options }: Attempt,
  token: string,
): Promise<string | DeviceFlowState> {
  const { url, field } = options.label;
  const response = await calls.fetch(url, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
  });

  const label = response?.ok ? text(parsed(await response.text()), field) : null;

  return (
    label ??
    ended(
      'failed',
      `${options.name} answered ${response?.status ?? 'nothing'} and did not say who signed in.`,
    )
  );
}

// Argo mints the Account id; the token lives in the Plugin's own secrets under it.
async function finish(attempt: Attempt, token: string): Promise<DeviceFlowState> {
  const label = await labelOf(attempt, token);

  if (typeof label !== 'string') return label;

  const { calls, options } = attempt;
  const id = await calls.accounts.add(options.host, { label });

  await calls.secrets.set(id, token);

  return { kind: 'signed-in', label };
}

// Polls until the service answers, the code runs out, or a newer attempt replaces this one.
async function awaitToken(attempt: Attempt, device: Device): Promise<DeviceFlowState> {
  let wait = device.intervalMs;

  while (attempt.live()) {
    await sleep(wait);

    if (!attempt.live()) break;

    if (Date.now() > device.expiresAt)
      return ended('expired', messages(attempt.options.name).expired);

    const polled = await poll(attempt, device);

    if (polled.kind === 'token') return finish(attempt, polled.token);

    if (polled.kind === 'ended') return polled.state;

    wait += polled.slower ? slowDownMs : 0;
  }

  return idle;
}

async function requestCode(attempt: Attempt): Promise<DeviceFlowState> {
  const { calls, options } = attempt;

  const reply = await postForm(calls, options.deviceUrl, {
    client_id: options.clientId,
    ...(options.scope && { scope: options.scope }),
  });

  const code = text(reply, 'device_code');
  const userCode = text(reply, 'user_code');
  const verificationUri = text(reply, 'verification_uri');

  if (!code || !userCode || !verificationUri)
    return ended(
      'failed',
      text(reply, 'error_description') ?? `${options.name} sent no sign-in code.`,
    );

  const lifetimeMs = seconds(reply, 'expires_in', 900) * msPerSecond;
  const expiresAt = Date.now() + lifetimeMs;
  const intervalMs = seconds(reply, 'interval', 5) * msPerSecond;

  const shown = attempt.settle({
    kind: 'code',
    userCode,
    verificationUri,
    expiresAt,
    lifetimeMs,
  });

  void awaitToken(attempt, { code, intervalMs, expiresAt }).then(
    attempt.settle,
    (error: Error) => attempt.settle(ended('failed', error.message)),
  );

  return shown;
}

/*
 * A kit pattern on the open `argo.fetch`, `argo.accounts` and `argo.secrets` calls: nothing here needs the Server
 * Device, a callback port or a client secret, so a paired phone finishes it too. `argo.changed()` is said at each
 * step, so the pages that draw the state redraw.
 */
export function deviceFlow(calls: Calls, options: DeviceFlowOptions): DeviceFlow {
  let held = idle;
  let current: symbol | null = null;

  const settling = (mine: symbol | null) => (state: DeviceFlowState): DeviceFlowState => {
    if (current !== mine) return held;

    held = state;
    calls.changed();

    return state;
  };

  return Object.freeze({
    state: () => held,
    start: () => {
      const mine = Symbol('attempt');

      current = mine;

      const attempt = {
        calls,
        options,
        live: () => current === mine,
        settle: settling(mine),
      };

      attempt.settle({ kind: 'requesting' });

      return requestCode(attempt).catch((error: Error) =>
        attempt.settle(ended('failed', error.message)),
      );
    },
    cancel: () => {
      current = null;
      held = idle;
      calls.changed();

      return idle;
    },
  });
}
