import {
  pollOutcome,
  post,
  requestDevice,
  tokenFields,
  tokenUrl,
  type Calls,
  type Device,
  type Poll,
  type Settled,
} from './device-requests';
import { githubHost } from './github-api';
import { githubClientId } from './github-client-id';
import { nonEmpty, parseJson, pick } from './json';

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

const cancelledStep: Settled = {
  kind: 'failed',
  message: 'Sign-in was cancelled.',
};

const sleep = (ms: number): Promise<void> =>
  new Promise((done) => setTimeout(done, ms));

type Pace = { device: Device; intervalMs: number };

async function pollOnce(
  calls: Calls,
  run: FlowRun,
  { device, intervalMs }: Pace,
): Promise<Poll> {
  await sleep(intervalMs);

  if (run.cancelled()) return cancelledStep;

  if (Date.now() > device.expiresAt) return { kind: 'expired' };

  const reply = await post(calls, tokenUrl, tokenFields(device));

  return pollOutcome(reply, intervalMs);
}

// Asks for the token at GitHub's pace until the person answers, the code runs out or the page stops waiting.
async function awaitToken(
  calls: Calls,
  device: Device,
  run: FlowRun,
): Promise<Settled> {
  let polled: Poll = { kind: 'wait', intervalMs: device.intervalMs };

  while (polled.kind === 'wait')
    polled = await pollOnce(calls, run, {
      device,
      intervalMs: polled.intervalMs,
    });

  return polled;
}

const bodyOf = async (
  response: Awaited<ReturnType<Calls['fetch']>>,
): Promise<string> => (response ? response.text() : 'null');

// GitHub's login names the Account: only the Plugin knows whose token this is.
async function loginOf(calls: Calls, token: string): Promise<string> {
  const response = await calls.fetch(`https://${githubHost}/user`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
  });

  const login = nonEmpty(pick(parseJson(await bodyOf(response)), 'login'));

  if (!login) throw new Error('GitHub did not say who signed in.');

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

async function settle(
  calls: Calls,
  borrowed: Borrowed,
  { run, polled }: { run: FlowRun; polled: Settled },
): Promise<FlowStep> {
  if (polled.kind !== 'token') return polled;

  const label = await keep(calls, borrowed, {
    token: polled.token,
    reauthorize: run.reauthorize,
  });

  return { kind: 'signed-in', label };
}

const codeStep = ({ userCode, verificationUri }: Device): FlowStep => ({
  kind: 'code',
  userCode,
  verificationUri,
});

async function authorize(
  calls: Calls,
  borrowed: Borrowed,
  run: FlowRun,
): Promise<FlowStep> {
  const device = await requestDevice(calls);

  if (typeof device === 'string') return { kind: 'failed', message: device };

  run.show(codeStep(device));

  const polled = await awaitToken(calls, device, run);

  return settle(calls, borrowed, { run, polled });
}

const failedWith = (cause: unknown): FlowStep => ({
  kind: 'failed',
  message: cause instanceof Error ? cause.message : String(cause),
});

const showUnlessCancelled = (run: FlowRun, step: FlowStep): void => {
  if (!run.cancelled()) run.show(step);
};

async function attempt(
  calls: Calls,
  borrowed: Borrowed,
  run: FlowRun,
): Promise<void> {
  try {
    showUnlessCancelled(run, await authorize(calls, borrowed, run));
  } catch (cause) {
    showUnlessCancelled(run, failedWith(cause));
  }
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

  await attempt(calls, borrowed, run);
}
