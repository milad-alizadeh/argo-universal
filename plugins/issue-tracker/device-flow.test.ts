import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { deviceFlow, type DeviceFlowOptions } from './device-flow';

type Reply = { status: number; body: unknown };

const github: DeviceFlowOptions = {
  host: 'api.github.com',
  name: 'GitHub',
  clientId: 'client-1',
  scope: 'repo',
  deviceUrl: 'https://github.com/login/device/code',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  label: { url: 'https://api.github.com/user', field: 'login' },
};

const userUrl = 'https://api.github.com/user';

const code: Reply = {
  status: 200,
  body: {
    device_code: 'device-1',
    user_code: 'WDJB-MJHT',
    verification_uri: 'https://github.com/login/device',
    expires_in: 900,
    interval: 1,
  },
};

const token: Reply = { status: 200, body: { access_token: 'token-1' } };

const user: Reply = { status: 200, body: { login: 'octocat' } };

const pending: Reply = {
  status: 200,
  body: { error: 'authorization_pending' },
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// A service answering each call to a URL with what the test scripted for it, the last answer repeating.
function fakeArgo(script: Record<string, Reply[]>): {
  argo: Parameters<typeof deviceFlow>[0];
  calls: { url: string; body: string | undefined }[];
  added: { host: string; label: string }[];
  secrets: Map<string, string>;
} {
  const calls: { url: string; body: string | undefined }[] = [];
  const added: { host: string; label: string }[] = [];
  const secrets = new Map<string, string>();

  const argo: Parameters<typeof deviceFlow>[0] = {
    fetch: (url, init) => {
      calls.push({ url, body: init?.body });
      const replies = script[url] ?? [];
      const next = replies.length > 1 ? replies.shift() : replies[0];

      return Promise.resolve(
        next
          ? {
              ok: next.status < 400,
              status: next.status,
              statusText: '',
              headers: {},
              body: JSON.stringify(next.body),
              truncated: false,
              text: () => Promise.resolve(JSON.stringify(next.body)),
              json: () => Promise.resolve(next.body),
            }
          : null,
      );
    },
    accounts: {
      add: (host, { label }) => {
        added.push({ host, label });

        return Promise.resolve('account-1');
      },
    },
    secrets: {
      set: (id, value) => {
        secrets.set(id, value);

        return Promise.resolve();
      },
    },
    changed: () => undefined,
  };

  return { argo, calls, added, secrets };
}

const wait = async (ms = 1000): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms);
};

it('shows the code once GitHub gives it, then adds the Account and keeps the token when approved', async () => {
  const fake = fakeArgo({
    [github.deviceUrl]: [code],
    [github.tokenUrl]: [token],
    [userUrl]: [user],
  });
  const flow = deviceFlow(fake.argo, github);

  expect(await flow.start()).toMatchObject({
    kind: 'code',
    userCode: 'WDJB-MJHT',
    verificationUri: 'https://github.com/login/device',
  });
  expect(fake.calls[0]?.body).toBe('client_id=client-1&scope=repo');

  await wait();

  expect(flow.state()).toEqual({ kind: 'signed-in', label: 'octocat' });
  expect(fake.added).toEqual([{ host: 'api.github.com', label: 'octocat' }]);
  expect(fake.secrets.get('account-1')).toBe('token-1');
  expect(fake.calls[1]?.body).toBe(
    'client_id=client-1&device_code=device-1&grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Adevice_code',
  );
});

it('keeps waiting through pending, and waits five seconds longer after slow_down', async () => {
  const fake = fakeArgo({
    [github.deviceUrl]: [code],
    [github.tokenUrl]: [
      pending,
      { status: 200, body: { error: 'slow_down' } },
      token,
    ],
    [userUrl]: [user],
  });
  const flow = deviceFlow(fake.argo, github);

  await flow.start();
  await wait();
  await wait();
  // The third poll waits one second plus slow_down's five.
  await wait(5000);
  expect(flow.state().kind).toBe('code');
  await wait(1000);
  expect(flow.state()).toEqual({ kind: 'signed-in', label: 'octocat' });
});

it.each([
  ['access_denied', 'denied'],
  ['expired_token', 'expired'],
  ['incorrect_client_credentials', 'failed'],
])('ends as %s when GitHub says so, with no Account', async (error, end) => {
  const fake = fakeArgo({
    [github.deviceUrl]: [code],
    [github.tokenUrl]: [
      { status: 200, body: { error, error_description: 'Why.' } },
    ],
  });
  const flow = deviceFlow(fake.argo, github);

  await flow.start();
  await wait();

  expect(flow.state()).toMatchObject({ kind: 'ended', end });
  expect(fake.added).toEqual([]);
});

it('says why GitHub sent no code', async () => {
  const fake = fakeArgo({
    [github.deviceUrl]: [
      {
        status: 200,
        body: { error_description: 'The client_id is not valid.' },
      },
    ],
  });
  const flow = deviceFlow(fake.argo, github);

  expect(await flow.start()).toEqual({
    kind: 'ended',
    end: 'failed',
    message: 'The client_id is not valid.',
  });
});

it('ends as expired when the code runs out before GitHub answers', async () => {
  const fake = fakeArgo({
    [github.deviceUrl]: [
      { status: 200, body: { ...Object(code.body), expires_in: 2 } },
    ],
    [github.tokenUrl]: [pending],
  });
  const flow = deviceFlow(fake.argo, github);

  await flow.start();
  await wait(3000);

  expect(flow.state()).toMatchObject({ kind: 'ended', end: 'expired' });
});

it('adds no Account for a sign-in cancelled while it waited', async () => {
  const fake = fakeArgo({
    [github.deviceUrl]: [code],
    [github.tokenUrl]: [token],
    [userUrl]: [user],
  });
  const flow = deviceFlow(fake.argo, github);

  await flow.start();
  expect(flow.cancel()).toEqual({ kind: 'idle' });
  await wait();

  expect(fake.added).toEqual([]);
  expect(flow.state()).toEqual({ kind: 'idle' });
});

it('fails when GitHub does not say who signed in', async () => {
  const fake = fakeArgo({
    [github.deviceUrl]: [code],
    [github.tokenUrl]: [token],
    [userUrl]: [{ status: 401, body: {} }],
  });
  const flow = deviceFlow(fake.argo, github);

  await flow.start();
  await wait();

  expect(flow.state()).toEqual({
    kind: 'ended',
    end: 'failed',
    message: 'GitHub answered 401 and did not say who signed in.',
  });
});
