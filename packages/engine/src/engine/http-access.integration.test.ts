import { beforeEach, expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import {
  sendHttpRequest,
  sendFormRequest,
  upgradeStatus,
} from '#mocks/http-client';

const infoRoute = '/trpc/system.info';
let url: string;
beforeEach(async (): Promise<void> => {
  url = (await startEngineTestHost()).url;
  vi.spyOn(console, 'error').mockImplementation((): void => {});
});

it.each([
  ['no Origin', {}],
  ['the desktop app', { origin: 'app://app' }],
  ['Expo web on localhost', { origin: 'http://localhost:8081' }],
  ['a web App on 127.0.0.1', { origin: 'http://127.0.0.1:6006' }],
])('accepts a WebSocket from %s', async (_name, headers): Promise<void> => {
  expect(await upgradeStatus(url, headers)).toBe(101);
});

it('accepts a WebSocket on localhost', async (): Promise<void> => {
  expect(
    await upgradeStatus(url, { host: `localhost:${new URL(url).port}` }),
  ).toBe(101);
});

it('accepts HTTP on localhost', async (): Promise<void> => {
  const response = await sendHttpRequest(url, {
    path: infoRoute,
    headers: { host: `localhost:${new URL(url).port}` },
  });
  expect(response.status).toBe(200);
});

it.each(['https://evil.example', 'http://localhost.evil.example', 'null'])(
  'rejects a WebSocket from %s',
  async (origin): Promise<void> => {
    expect(await upgradeStatus(url, { origin })).toBe(403);
  },
);

it.each(['evil.example:7337', '127.0.0.1:0'])(
  'rejects a WebSocket with another Host %s',
  async (host): Promise<void> => {
    expect(await upgradeStatus(url, { host })).toBe(403);
  },
);

it.each([
  ['the desktop app', 'app://app'],
  ['Expo web on localhost', 'http://localhost:8081'],
])(
  'lets %s call tRPC and read the answer',
  async (_name, origin): Promise<void> => {
    const response = await sendFormRequest(url, origin);
    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(origin);
  },
);

it.each(['https://evil.example', 'null'])(
  'refuses a tRPC call from Origin %s and counts it',
  async (origin): Promise<void> => {
    const response = await sendFormRequest(url, origin);
    expect(response.status).toBe(403);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      `engine: rejected Origin ${JSON.stringify(origin)} #1`,
    );
  },
);

it.each(['/blobs/' + '0'.repeat(64), infoRoute])(
  'answers 403 to %s from another Host and counts it',
  async (path): Promise<void> => {
    const response = await sendHttpRequest(url, {
      path,
      headers: { host: 'evil.example:7337' },
    });
    expect(response.status).toBe(403);
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      'engine: rejected Host "evil.example:7337" #1',
    );
  },
);

it('answers 403 to a Host that is not a plain host and port', async (): Promise<void> => {
  const response = await sendHttpRequest(url, {
    path: infoRoute,
    headers: { host: `evil.example@${new URL(url).host}` },
  });
  expect(response.status).toBe(403);
});
