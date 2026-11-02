import type { Argo } from '@argo/plugin-kit';
import type { DeviceClient } from './device-code';
import {
  postForm,
  text,
  type Fields,
  type PostTarget,
  type Reply,
} from './reply';
import { denied, expired, failed, type Ended, type FlowRun } from './steps';
import { tokensOf, type Tokens } from './tokens';

type Calls = Pick<Argo, 'fetch'>;

const deviceGrant = 'urn:ietf:params:oauth:grant-type:device_code';

// RFC 8628: `slow_down` adds this much to the wait.
const slowDownSeconds = 5;

// How much longer to wait on each "still waiting" answer.
const slower = new Map([
  ['authorization_pending', 0],
  ['slow_down', slowDownSeconds],
]);

const msPerSecond = 1000;

const secondsPerMinute = 60;

export type Device = {
  deviceCode: string;
  intervalSeconds: number;
  expiresInSeconds: number;
  expiresAt: number;
};

export type Settled = { kind: 'token'; tokens: Tokens } | Ended;

type Poll = Settled | { kind: 'wait'; intervalSeconds: number };

const sleep = (duration: number): Promise<void> =>
  new Promise((done) => setTimeout(done, duration * msPerSecond));

const refused = (client: DeviceClient, reply: Reply): Ended =>
  failed(
    text(reply, 'error_description') ?? `${client.name} refused the sign-in.`,
  );

const codeExpired = (client: DeviceClient, device: Device): Ended =>
  expired(client.name, Math.round(device.expiresInSeconds / secondsPerMinute));

function waitOf(reply: Reply, intervalSeconds: number): Poll | null {
  const extra = slower.get(text(reply, 'error') ?? '');

  return extra === undefined
    ? null
    : { kind: 'wait', intervalSeconds: intervalSeconds + extra };
}

type Poller = {
  calls: Calls;
  client: DeviceClient;
  run: FlowRun;
  device: Device;
};

function endingOf({ client, device }: Poller, reply: Reply): Ended {
  const code = text(reply, 'error');

  if (code === 'access_denied') return denied(client.name);

  return code === 'expired_token'
    ? codeExpired(client, device)
    : refused(client, reply);
}

function outcomeOf(
  poller: Poller,
  reply: Reply,
  intervalSeconds: number,
): Poll {
  const tokens = tokensOf(reply);

  if (tokens) return { kind: 'token', tokens };

  return waitOf(reply, intervalSeconds) ?? endingOf(poller, reply);
}

const tokenTarget = ({ tokenUrl, name }: DeviceClient): PostTarget => ({
  url: tokenUrl,
  name,
});

const tokenFields = (
  { clientId }: DeviceClient,
  { deviceCode }: Device,
): Fields => ({
  client_id: clientId,
  device_code: deviceCode,
  grant_type: deviceGrant,
});

async function pollOnce(
  poller: Poller,
  intervalSeconds: number,
): Promise<Poll> {
  const { calls, client, run, device } = poller;

  await sleep(intervalSeconds);

  // The page has moved on from a cancelled run, so nothing reads this answer.
  if (run.cancelled()) return failed('Sign-in was cancelled.');

  if (Date.now() > device.expiresAt) return codeExpired(client, device);

  const target = tokenTarget(client);
  const fields = tokenFields(client, device);
  const reply = await postForm(calls.fetch, target, fields);

  return outcomeOf(poller, reply, intervalSeconds);
}

// Polls until the service answers, or the code runs out.
export async function awaitToken(poller: Poller): Promise<Settled> {
  let polled: Poll = {
    kind: 'wait',
    intervalSeconds: poller.device.intervalSeconds,
  };

  while (polled.kind === 'wait')
    polled = await pollOnce(poller, polled.intervalSeconds);

  return polled;
}
