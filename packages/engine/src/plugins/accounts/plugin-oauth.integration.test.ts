import { createServer } from 'node:http';
import { expect, it } from 'vitest';
import { serialiseOnOAuthPort } from '#mocks/oauth-port-lock';
import { redirectUri } from './oauth-listener';
import { PluginOAuth } from './plugin-oauth';

serialiseOnOAuthPort();

it('ignores callbacks from a cancelled exchange and releases the port after the last cancellation', async () => {
  const broker = new PluginOAuth(() => {}, undefined, {
    open: (): Promise<void> => Promise.resolve(),
  });

  const alice = { pluginId: 'alice', generation: 1 };
  const bob = { pluginId: 'bob', generation: 1 };

  try {
    const first = await broker.start(alice);
    const last = await broker.start(bob);

    if (!first || !last) throw new Error('Both fixture exchanges must start');

    const firstAnswer = broker.await(alice, {
      state: first.state,
      url: 'https://fixture.example/',
    });

    const lastAnswer = broker.await(bob, {
      state: last.state,
      url: 'https://fixture.example/',
    });

    await broker.cancel(bob, first.state);
    expect(broker.issued(alice, first.state)).toBe(true);

    await broker.cancel(alice, first.state);
    await expect(firstAnswer).resolves.toBeNull();
    expect(
      (await fetch(`${redirectUri}?state=${first.state}&code=late`)).status,
    ).toBe(400);

    await broker.cancel(bob, last.state);
    await expect(lastAnswer).resolves.toBeNull();
    const listener = createServer();
    await new Promise<void>((resolve, reject) => {
      listener.once('error', reject);
      listener.listen(51789, '127.0.0.1', resolve);
    });
    await new Promise<void>((resolve) => listener.close(() => resolve()));
  } finally {
    broker.close();
  }
});
