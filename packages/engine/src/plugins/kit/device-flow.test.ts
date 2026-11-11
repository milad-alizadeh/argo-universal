import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  code,
  fakeDevice,
  pending,
  service,
  token,
  user,
  userUrl,
} from '#mocks/device-service';
import { deviceFlow } from './device-flow';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const approved = {
  [service.deviceUrl]: [code],
  [service.tokenUrl]: [token],
  [userUrl]: [user],
};

const wait = async (ms = 1000): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms);
};

it('shows the code once the service gives it, then adds the Account and keeps the token when approved', async () => {
  const fake = fakeDevice(approved);
  const flow = deviceFlow(fake.argo, service);

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

it('needs no Server Device, and says each step so the pages that draw it redraw', async () => {
  const fake = fakeDevice(approved);
  const flow = deviceFlow(fake.argo, service);

  await flow.start();
  await wait();

  expect(flow.serverDevice).toBe(false);
  // Asking, the code, signed in.
  expect(fake.changes()).toBe(3);
});

it('keeps waiting through pending, and waits five seconds longer after slow_down', async () => {
  const slow = { status: 200, body: { error: 'slow_down' } };

  const fake = fakeDevice({
    ...approved,
    [service.tokenUrl]: [pending, slow, token],
  });

  const flow = deviceFlow(fake.argo, service);

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
])(
  'ends as %s when the service says so, with no Account',
  async (error, end) => {
    const reply = { status: 200, body: { error, error_description: 'Why.' } };
    const fake = fakeDevice({ ...approved, [service.tokenUrl]: [reply] });
    const flow = deviceFlow(fake.argo, service);

    await flow.start();
    await wait();

    expect(flow.state()).toMatchObject({ kind: 'ended', end });
    expect(fake.added).toEqual([]);
  },
);

it('says why the service sent no code', async () => {
  const reply = {
    status: 200,
    body: { error_description: 'The client_id is not valid.' },
  };

  const fake = fakeDevice({ [service.deviceUrl]: [reply] });
  const flow = deviceFlow(fake.argo, service);

  expect(await flow.start()).toEqual({
    kind: 'ended',
    end: 'failed',
    message: 'The client_id is not valid.',
  });
});

it('ends as expired when the code runs out before the service answers', async () => {
  const short = { ...code, body: { ...code.body, expires_in: 2 } };

  const fake = fakeDevice({
    ...approved,
    [service.deviceUrl]: [short],
    [service.tokenUrl]: [pending],
  });

  const flow = deviceFlow(fake.argo, service);

  await flow.start();
  await wait(3000);

  expect(flow.state()).toMatchObject({ kind: 'ended', end: 'expired' });
});

it('adds no Account for a sign-in cancelled while it waited', async () => {
  const fake = fakeDevice(approved);
  const flow = deviceFlow(fake.argo, service);

  await flow.start();
  expect(flow.cancel()).toEqual({ kind: 'idle' });
  await wait();

  expect(fake.added).toEqual([]);
  expect(flow.state()).toEqual({ kind: 'idle' });
});

it('fails when the service does not say who signed in', async () => {
  const fake = fakeDevice({
    ...approved,
    [userUrl]: [{ status: 401, body: {} }],
  });

  const flow = deviceFlow(fake.argo, service);

  await flow.start();
  await wait();

  expect(flow.state()).toEqual({
    kind: 'ended',
    end: 'failed',
    message: 'GitHub answered 401 and did not say who signed in.',
  });
});

it('hands a borrower the token it kept, in the header it names', async () => {
  const fake = fakeDevice(approved);
  const provided: unknown[] = [];

  const provide = (
    host: string,
    header: { header: string; prefix: string },
  ): Promise<void> => {
    provided.push({ host, header });

    return Promise.resolve();
  };

  const accounts = { ...fake.argo.accounts, provide };

  await deviceFlow({ ...fake.argo, accounts }, service).provide();

  expect(provided).toEqual([
    {
      host: 'api.github.com',
      header: { header: 'Authorization', prefix: 'Bearer' },
    },
  ]);
});
