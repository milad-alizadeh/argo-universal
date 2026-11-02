import type { Argo } from '@argo/plugin-kit';
import {
  askForCode,
  codeOf,
  noCode,
  type CodeAnswer,
  type DeviceClient,
} from './device-code';
import { awaitToken, type Device, type Settled } from './device-poll';
import { seconds, type Reply } from './reply';
import type { CodeStep, Ended, FlowRun } from './steps';

type Calls = Pick<Argo, 'fetch'>;

const defaultIntervalSeconds = 5;

const defaultExpirySeconds = 900;

const msPerSecond = 1000;

function deviceOf(reply: Reply, deviceCode: string): Device {
  const expiresInSeconds = seconds(reply, 'expires_in') ?? defaultExpirySeconds;

  return {
    deviceCode,
    intervalSeconds: seconds(reply, 'interval') ?? defaultIntervalSeconds,
    expiresInSeconds,
    expiresAt: Date.now() + expiresInSeconds * msPerSecond,
  };
}

const codeStep = (
  { userCode, verificationUri }: CodeAnswer,
  { expiresAt, expiresInSeconds }: Device,
): CodeStep => ({
  kind: 'code',
  userCode,
  verificationUri,
  expiresAt,
  lifetimeMs: expiresInSeconds * msPerSecond,
});

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

  const { device, code } = started;

  run.show(codeStep(code, device));

  return awaitToken({ calls, client, run, device });
}
