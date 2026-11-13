import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  code,
  fakeDevice,
  service,
  user,
  userUrl,
  unreachable,
  type FakeDevice,
  type Reply,
} from '#mocks/device-service';
import { deviceFlow } from './device-flow';
import { KeptToken } from './device-token';

const signedInAt = new Date('2026-11-13T07:10:00Z');

beforeEach(() => {
  vi.useFakeTimers({ now: signedInAt });
});

afterEach(() => {
  vi.useRealTimers();
});

const eightHours = 8 * 60 * 60;

const expiring = (access: string, refresh: string): Reply => ({
  status: 200,
  body: {
    access_token: access,
    refresh_token: refresh,
    expires_in: eightHours,
  },
});

const badRefresh: Reply = {
  status: 200,
  body: { error: 'bad_refresh_token' },
};

// Signs in through the flow, so the token is kept as a sign-in keeps it, and registers the provider.
async function signedIn(tokenReplies: Reply[]): Promise<FakeDevice> {
  const fake = fakeDevice({
    [service.deviceUrl]: [code],
    [service.tokenUrl]: tokenReplies,
    [userUrl]: [user],
  });

  const flow = deviceFlow(fake.argo, service);

  await flow.provide();
  await flow.start();
  await vi.advanceTimersByTimeAsync(1000);
  expect(flow.state()).toEqual({ kind: 'signed-in', label: 'octocat' });

  return fake;
}

const refreshCalls = (fake: FakeDevice): FakeDevice['calls'] =>
  fake.calls.filter((call) => call.body?.includes('grant_type=refresh_token'));

const keptSecret = (fake: FakeDevice): KeptToken =>
  KeptToken.parse(JSON.parse(fake.secrets.get('account-1') ?? ''));

async function afterEightHours(): Promise<void> {
  await vi.advanceTimersByTimeAsync(eightHours * 1000);
}

it('keeps the refresh token beside the access token, with when it runs out', async () => {
  const fake = await signedIn([expiring('access-1', 'refresh-1')]);

  expect(keptSecret(fake)).toEqual({
    access: 'access-1',
    refresh: 'refresh-1',
    // Signed in at the first poll, one second after the clock started.
    expiresAtMs: signedInAt.getTime() + 1000 + eightHours * 1000,
  });
});

it('lends the kept token while it is fresh, without refreshing', async () => {
  const fake = await signedIn([expiring('access-1', 'refresh-1')]);

  expect(await fake.borrow('account-1')).toBe('access-1');
  expect(refreshCalls(fake)).toEqual([]);
});

it('refreshes a token that has run out with the client ID and refresh token alone', async () => {
  const fake = await signedIn([
    expiring('access-1', 'refresh-1'),
    expiring('access-2', 'refresh-2'),
  ]);

  await afterEightHours();

  expect(await fake.borrow('account-1')).toBe('access-2');
  expect(refreshCalls(fake).map((call) => call.body)).toEqual([
    'client_id=client-1&grant_type=refresh_token&refresh_token=refresh-1',
  ]);
});

it('keeps the refreshed pair, so the next borrow lends it without refreshing again', async () => {
  const fake = await signedIn([
    expiring('access-1', 'refresh-1'),
    expiring('access-2', 'refresh-2'),
  ]);

  await afterEightHours();
  await fake.borrow('account-1');

  expect(keptSecret(fake)).toMatchObject({
    access: 'access-2',
    refresh: 'refresh-2',
  });
  expect(await fake.borrow('account-1')).toBe('access-2');
  expect(refreshCalls(fake)).toHaveLength(1);
});

it('keeps the old refresh token when the refresh answer gives none', async () => {
  const fake = await signedIn([
    expiring('access-1', 'refresh-1'),
    { status: 200, body: { access_token: 'access-2', expires_in: eightHours } },
  ]);

  await afterEightHours();
  await fake.borrow('account-1');

  expect(keptSecret(fake)).toMatchObject({
    access: 'access-2',
    refresh: 'refresh-1',
  });
});

it('refreshes a minute before the token runs out', async () => {
  const fake = await signedIn([
    expiring('access-1', 'refresh-1'),
    expiring('access-2', 'refresh-2'),
  ]);

  await vi.advanceTimersByTimeAsync((eightHours - 30) * 1000);

  expect(await fake.borrow('account-1')).toBe('access-2');
});

it('spends a refresh token once when borrows that find it due arrive together', async () => {
  const fake = await signedIn([
    expiring('access-1', 'refresh-1'),
    expiring('access-2', 'refresh-2'),
  ]);

  await afterEightHours();
  await Promise.all([fake.borrow('account-1'), fake.borrow('account-1')]);

  expect(refreshCalls(fake)).toHaveLength(1);
});

it.each([
  ['refuses the refresh', badRefresh],
  ['cannot be reached', unreachable],
])(
  'lends the old token when the service %s, so the read finds the person signed out',
  async (_case, refusal) => {
    const fake = await signedIn([expiring('access-1', 'refresh-1'), refusal]);

    await afterEightHours();

    expect(await fake.borrow('account-1')).toBe('access-1');
  },
);

it('keeps a token that never runs out as the bare string', async () => {
  const fake = await signedIn([
    { status: 200, body: { access_token: 'token-1' } },
  ]);

  expect(fake.secrets.get('account-1')).toBe('token-1');
});

it('lends a token that never runs out as it is, however long it was kept', async () => {
  const fake = await signedIn([
    { status: 200, body: { access_token: 'token-1' } },
  ]);

  await afterEightHours();

  expect(await fake.borrow('account-1')).toBe('token-1');
  expect(refreshCalls(fake)).toEqual([]);
});

it('lends nothing for an Account with no token kept', async () => {
  const fake = fakeDevice({});

  await deviceFlow(fake.argo, service).provide();

  expect(await fake.borrow('account-1')).toBeNull();
});
