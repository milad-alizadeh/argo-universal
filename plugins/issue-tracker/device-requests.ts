import type { Argo } from '@argo/plugin-kit';
import type { FlowStep } from './device-flow';
import { githubClientId } from './github-client-id';
import { isObject, nonEmpty, parseJson, type JsonObject } from './json';

export type Calls = Pick<Argo, 'fetch' | 'accounts' | 'secrets'>;

const codeUrl = 'https://github.com/login/device/code';

export const tokenUrl = 'https://github.com/login/oauth/access_token';

const deviceGrant = 'urn:ietf:params:oauth:grant-type:device_code';

// `repo` reads and changes the Issues of private repositories, which a Project often is.
const scope = 'repo';

// GitHub asks a client that polls too fast to wait this much longer each time (RFC 8628).
const slowDownMs = 5000;

const msPerSecond = 1000;

const defaultIntervalSeconds = 5;

const defaultExpirySeconds = 900;

type Fields = { [name: string]: string };

const form = (fields: Fields): string =>
  Object.entries(fields)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

// GitHub answers a form post with JSON when asked to, and with 200 even for "still waiting".
const formPost = (fields: Fields): Parameters<Calls['fetch']>[1] => ({
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded',
  },
  body: form(fields),
});

export async function post(
  calls: Calls,
  url: string,
  fields: Fields,
): Promise<JsonObject> {
  const response = await calls.fetch(url, formPost(fields));

  if (!response) throw new Error('GitHub could not be reached.');

  const reply = parseJson(await response.text());

  return isObject(reply) ? reply : {};
}

const text = (reply: JsonObject, key: string): string | null =>
  nonEmpty(reply[key]);

const seconds = (reply: JsonObject, key: string, fallback: number): number => {
  const value = reply[key];

  return typeof value === 'number' && value >= 0 ? value : fallback;
};

export type Device = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  intervalMs: number;
  expiresAt: number;
};

type Link = Pick<Device, 'userCode' | 'verificationUri'>;

const linkOf = (reply: JsonObject): Link | null => {
  const userCode = text(reply, 'user_code');
  const verificationUri = text(reply, 'verification_uri');

  return userCode && verificationUri ? { userCode, verificationUri } : null;
};

const codesOf = (
  reply: JsonObject,
): (Link & Pick<Device, 'deviceCode'>) | null => {
  const link = linkOf(reply);
  const deviceCode = text(reply, 'device_code');

  return link && deviceCode ? { deviceCode, ...link } : null;
};

function deviceOf(reply: JsonObject, now: number): Device | string {
  const codes = codesOf(reply);

  if (!codes)
    return text(reply, 'error_description') ?? 'GitHub sent no sign-in code.';

  return {
    ...codes,
    intervalMs:
      seconds(reply, 'interval', defaultIntervalSeconds) * msPerSecond,
    expiresAt:
      now + seconds(reply, 'expires_in', defaultExpirySeconds) * msPerSecond,
  };
}

// How a poll ended: still waiting, or a token, or a step that ends the flow.
type Ended = Exclude<FlowStep, { kind: 'requesting' | 'code' | 'signed-in' }>;

export type Settled = { kind: 'token'; token: string } | Ended;

export type Poll = Settled | { kind: 'wait'; intervalMs: number };

const errorOutcomes: ReadonlyMap<string, (intervalMs: number) => Poll> =
  new Map([
    [
      'authorization_pending',
      (intervalMs: number): Poll => ({ kind: 'wait', intervalMs }),
    ],
    [
      'slow_down',
      (intervalMs: number): Poll => ({
        kind: 'wait',
        intervalMs: intervalMs + slowDownMs,
      }),
    ],
    ['access_denied', (): Poll => ({ kind: 'denied' })],
    ['expired_token', (): Poll => ({ kind: 'expired' })],
  ]);

const refused = (reply: JsonObject): Poll => ({
  kind: 'failed',
  message: text(reply, 'error_description') ?? 'GitHub refused the sign-in.',
});

function errorOutcome(reply: JsonObject, intervalMs: number): Poll {
  const known = errorOutcomes.get(text(reply, 'error') ?? '');

  return known ? known(intervalMs) : refused(reply);
}

export function pollOutcome(reply: JsonObject, intervalMs: number): Poll {
  const token = text(reply, 'access_token');

  return token ? { kind: 'token', token } : errorOutcome(reply, intervalMs);
}

export const tokenFields = (
  device: Device,
): Record<'client_id' | 'device_code' | 'grant_type', string> => ({
  client_id: githubClientId,
  device_code: device.deviceCode,
  grant_type: deviceGrant,
});

export async function requestDevice(calls: Calls): Promise<Device | string> {
  const reply = await post(calls, codeUrl, {
    client_id: githubClientId,
    scope,
  });

  return deviceOf(reply, Date.now());
}
