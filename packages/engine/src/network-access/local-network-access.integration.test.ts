import { describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { startEngineTestHost } from '#mocks/engine';
import { closed, connect, lanAddress, reachable } from '#mocks/engine-network';

const portOf = (url: string): number => Number(new URL(url).port);

it('keeps the Server off the network on a fresh Server', async (): Promise<void> => {
  const { caller, url } = await startEngineTestHost();

  expect(await caller.network.localAccess()).toEqual({ enabled: false });
  expect(await reachable('127.0.0.1', portOf(url))).toBe(true);
});

// A computer with no network has no address another Device could use.
describe.skipIf(!lanAddress)('on a computer with a network', () => {
  it('refuses the local network while off', async (): Promise<void> => {
    const { url } = await startEngineTestHost();

    expect(await reachable(lanAddress, portOf(url))).toBe(false);
  });

  it('accepts the local network while on and refuses it again once off, without a restart', async (): Promise<void> => {
    const { caller, url } = await startEngineTestHost();
    const port = portOf(url);

    await caller.network.setLocalAccess({ enabled: true });
    const remote = await connect(lanAddress, port);
    const own = await connect('127.0.0.1', port);

    await caller.network.setLocalAccess({ enabled: false });
    await closed(remote);

    expect(await reachable(lanAddress, port)).toBe(false);
    expect(own.readyState).toBe(WebSocket.OPEN);
    expect(await reachable('127.0.0.1', port)).toBe(true);
    expect(await caller.network.localAccess()).toEqual({ enabled: false });
  });

  it('stays as the owner left it across a restart', async (): Promise<void> => {
    const first = await startEngineTestHost();
    await first.caller.network.setLocalAccess({ enabled: true });
    await first.stop();

    const second = await startEngineTestHost({ home: first.home });
    expect(await second.caller.network.localAccess()).toEqual({
      enabled: true,
    });
    expect(await reachable(lanAddress, portOf(second.url))).toBe(true);
    await second.caller.network.setLocalAccess({ enabled: false });
    await second.stop();

    const third = await startEngineTestHost({ home: first.home });
    expect(await third.caller.network.localAccess()).toEqual({
      enabled: false,
    });
    expect(await reachable(lanAddress, portOf(third.url))).toBe(false);
  });
});
