import type { Argo } from '@argo/plugin-kit';
import {
  askForCode,
  codeOf,
  noCode,
  type CodeAnswer,
  type DeviceClient,
} from './device-code';
import {
  postForm,
  seconds,
  text,
  type Fields,
  type PostTarget,
  type Reply,
} from './reply';
import { denied, expired, failed, type Ended, type FlowRun } from './steps';
import { tokensOf, type Tokens } from './tokens';

type Calls = Pick<Argo, 'fetch'>;

const deviceGrant = 'urn:ietf:params:oauth:grant-type:device_code';

// RFC 8628: how much longer to wait on each "still waiting" answer, and the defaults when a service names none.
const defaultIntervalSeconds = 5;

const slower = new Map([
  ['authorization_pending', 0],
  ['slow_down', defaultIntervalSeconds],
]);

const defaultExpirySeconds = 900;

const msPerSecond = 1000;

const secondsPerMinute = 60;

type Device = {
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

async function awaitToken(poller: Poller): Promise<Settled> {
  let polled: Poll = {
    kind: 'wait',
    intervalSeconds: poller.device.intervalSeconds,
  };

  while (polled.kind === 'wait')
    polled = await pollOnce(poller, polled.intervalSeconds);

  return polled;
}

function deviceOf(reply: Reply, deviceCode: string): Device {
  const expiresInSeconds = seconds(reply, 'expires_in') ?? defaultExpirySeconds;

  return {
    deviceCode,
    intervalSeconds: seconds(reply, 'interval') ?? defaultIntervalSeconds,
    expiresInSeconds,
    expiresAt: Date.now() + expiresInSeconds * msPerSecond,
  };
}

type Started = { kind: 'started'; device: Device; code: CodeAnswer } | Ended;

async function requestDevice(
  calls: Calls,
  client: DeviceClient,
): Promise<Started> {
  const reply = await askForCode(calls, client);
  const code = codeOf(reply);

  return code
    ? { kind: 'started', code, device: deviceOf(reply, code.deviceCode) }
    : noCode(client, reply);
}

/*
 * The device flow (RFC 8628): the page shows a code, the person enters it on any device, and the Plugin polls for the
 * token. Nothing here needs the Server Device, a callback port or a secret, so a paired phone finishes it too.
 */
export async function runDeviceFlow(
  calls: Calls,
  client: DeviceClient,
  run: FlowRun,
): Promise<Settled> {
  const started = await requestDevice(calls, client);

  if (started.kind !== 'started') return started;

  const { userCode, verificationUri } = started.code;

  run.show({ kind: 'code', userCode, verificationUri });

  return awaitToken({ calls, client, run, device: started.device });
}
