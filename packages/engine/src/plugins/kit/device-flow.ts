import type {
  DeviceFlowArgo,
  DeviceFlowOptions,
  DeviceFlowPattern,
  DeviceFlowState,
} from '@repo/contracts/plugins/device-flow-api';
import type { z } from 'zod';
import { CodeAnswer, CompleteCode, labelRead, postForm } from './device-http';
import { sleep } from './scheduler';
import { ended, expired, pollOnce, type Device, type Polled } from './device-poll';

const slowDownMs = 5000;

const msPerSecond = 1000;

const idle: DeviceFlowState = { kind: 'idle' };

const bearer = { header: 'Authorization', prefix: 'Bearer' };

// What one attempt reaches: the Plugin's calls, the service, and whether it is still the current one.
type Attempt = {
  argo: DeviceFlowArgo;
  options: DeviceFlowOptions;
  live: () => boolean;
  settle: (state: DeviceFlowState) => DeviceFlowState;
};

// Argo mints the Account id and reuses the row of a person who signs in again; the token is kept under it.
async function finish(
  { argo, options }: Attempt,
  token: string,
): Promise<DeviceFlowState> {
  const { label, status } = await labelRead(argo.fetch, token, options.label);

  if (!label)
    return ended(
      'failed',
      `${options.name} answered ${status ?? 'nothing'} and did not say who signed in.`,
    );

  const id = await argo.accounts.add(options.host, { label });

  await argo.secrets.set(id, token);

  return { kind: 'signed-in', label };
}

const stateOf = (polled: Polled): DeviceFlowState =>
  polled.kind === 'ended' ? polled.state : idle;

const settled = async (attempt: Attempt, polled: Polled): Promise<DeviceFlowState> =>
  polled.kind === 'token' ? finish(attempt, polled.token) : stateOf(polled);

// One poll, unless the attempt was replaced or the code ran out first.
async function step(attempt: Attempt, device: Device): Promise<Polled> {
  if (!attempt.live()) return { kind: 'ended', state: idle };

  if (Date.now() > device.expiresAt)
    return { kind: 'ended', state: expired(attempt.options) };

  return pollOnce(attempt.argo.fetch, attempt.options, device);
}

// Polls until the service answers, the code runs out, or a newer attempt replaces this one.
async function awaitToken(
  attempt: Attempt,
  device: Device,
  intervalMs: number,
): Promise<DeviceFlowState> {
  let wait = intervalMs;
  let polled: Polled = { kind: 'wait', slower: false };

  while (polled.kind === 'wait') {
    wait += polled.slower ? slowDownMs : 0;
    await sleep(wait);
    polled = await step(attempt, device);
  }

  return settled(attempt, polled);
}

// What the service gave for the code, when it gave one.
type Code = { device: Device; userCode: string; uri: string; lifetimeMs: number; intervalMs: number };

const msOf = (seconds: number): number => seconds * msPerSecond;

const codeOf = (reply: z.infer<typeof CodeAnswer>): Code | null => {
  const complete = CompleteCode.safeParse(reply);

  if (!complete.success) return null;

  const { device_code: code, user_code: userCode } = complete.data;
  const lifetimeMs = msOf(complete.data.expires_in);

  return {
    device: { code, expiresAt: Date.now() + lifetimeMs },
    userCode,
    uri: complete.data.verification_uri,
    lifetimeMs,
    intervalMs: msOf(complete.data.interval),
  };
};

const shown = (found: Code): DeviceFlowState => ({
  kind: 'code',
  userCode: found.userCode,
  verificationUri: found.uri,
  expiresAt: found.device.expiresAt,
  lifetimeMs: found.lifetimeMs,
});

const askFor = (attempt: Attempt): Promise<z.infer<typeof CodeAnswer>> => {
  const { argo, options } = attempt;
  const fields = { client_id: options.clientId, ...(options.scope && { scope: options.scope }) };

  return postForm(argo.fetch, { url: options.deviceUrl, fields }, CodeAnswer);
};

// Asks for a code and shows it; the wait for the person goes on past the call that started it.
async function requestCode(attempt: Attempt): Promise<DeviceFlowState> {
  const reply = await askFor(attempt);
  const found = codeOf(reply);

  if (!found)
    return ended('failed', reply.error_description ?? `${attempt.options.name} sent no sign-in code.`);

  void awaitToken(attempt, found.device, found.intervalMs).then(
    attempt.settle,
    (error: Error) => attempt.settle(ended('failed', error.message)),
  );

  return attempt.settle(shown(found));
}

type Held = { state: DeviceFlowState; attempt: symbol | null };

// A new attempt replaces the one before, whose answers then change nothing.
function attemptOf(held: Held, argo: DeviceFlowArgo, options: DeviceFlowOptions): Attempt {
  const mine = Symbol('attempt');

  held.attempt = mine;

  return {
    argo,
    options,
    live: () => held.attempt === mine,
    settle: (state) => {
      if (held.attempt !== mine) return held.state;

      held.state = state;
      argo.changed();

      return state;
    },
  };
}

// A borrower's request gets the kept token in the header the flow names; Argo sets it.
const provide = (argo: DeviceFlowArgo, options: DeviceFlowOptions): Promise<void> =>
  argo.accounts.provide(options.host, options.header ?? bearer, (account) =>
    argo.secrets.get(account.id),
  );

/*
 * A kit pattern on the open `argo.fetch`, `argo.accounts` and `argo.secrets` calls: ask for a code, show it, poll
 * for the token, add the Account and keep its token, saying `argo.changed()` at each step so the pages that draw
 * the state redraw. Nothing here needs the Server Device, a callback port or a client secret.
 */
export const deviceFlow: DeviceFlowPattern = (argo, options) => {
  const held: Held = { state: idle, attempt: null };

  return Object.freeze({
    serverDevice: false,
    state: () => held.state,
    start: () => start(held, argo, options),
    cancel: () => cancel(held, argo),
    provide: () => provide(argo, options),
  });
};

function start(held: Held, argo: DeviceFlowArgo, options: DeviceFlowOptions): Promise<DeviceFlowState> {
  const attempt = attemptOf(held, argo, options);

  attempt.settle({ kind: 'requesting' });

  return requestCode(attempt).catch((error: Error) =>
    attempt.settle(ended('failed', error.message)),
  );
}

function cancel(held: Held, argo: DeviceFlowArgo): DeviceFlowState {
  held.attempt = null;
  held.state = idle;
  argo.changed();

  return idle;
}
