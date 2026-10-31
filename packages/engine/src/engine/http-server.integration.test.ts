import { expect, it } from 'vitest';
import {
  home,
  port,
  upgradeStatus,
  systemInfoStatus,
} from '#mocks/engine-http';
import { userTokenHeaders } from '#mocks/engine-proof';

it.each([
  ['no Origin', {}],
  ['the desktop app', { origin: 'app://app' }],
  ['Expo web on localhost', { origin: 'http://localhost:8081' }],
  ['a web App on 127.0.0.1', { origin: 'http://127.0.0.1:6006' }],
])('accepts a WebSocket from %s', async (_name, headers): Promise<void> => {
  expect(await upgradeStatus(headers)).toBe(101);
});

it('accepts a WebSocket and HTTP on localhost', async (): Promise<void> => {
  expect(await upgradeStatus({ host: `localhost:${port}` })).toBe(101);
  expect(await systemInfoStatus({ host: `localhost:${port}` })).toBe(200);
});

it('answers feed.page from the database', async (): Promise<void> => {
  const input = encodeURIComponent(
    JSON.stringify({ sessionId: 'session-1', direction: 'tail' }),
  );

  const response = await fetch(
    `http://127.0.0.1:${port}/trpc/feed.page?input=${input}`,
    { headers: await userTokenHeaders(home) },
  );

  expect(await response.json()).toMatchObject({
    result: { data: { epoch: 0, rows: [], startCursor: null } },
  });
});

it.each(['https://evil.example', 'http://localhost.evil.example', 'null'])(
  'rejects a WebSocket from %s',
  async (origin): Promise<void> => {
    expect(await upgradeStatus({ origin })).toBe(403);
  },
);

// The Host allowlist went with ADR-0045: on loopback the front door has already said which Device this is, and Host is a header anyone can write.
it('asks nothing of the Host a Connection from this computer sends', async (): Promise<void> => {
  expect(await upgradeStatus({ host: 'evil.example:7337' })).toBe(101);
  expect(await upgradeStatus({ host: `127.0.0.1:${port + 1}` })).toBe(101);
});
