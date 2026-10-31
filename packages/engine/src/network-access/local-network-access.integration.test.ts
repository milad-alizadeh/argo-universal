import { Server } from 'node:http';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { WebSocket } from 'ws';
import { startEngineTestHost } from '#mocks/engine';
import {
  closed,
  connect,
  lanAddress,
  reachable,
  refuseBinds,
  upgradeStatus,
} from '#mocks/engine-network';

const portOf = (url: string): number => Number(new URL(url).port);

afterEach(() => {
  vi.restoreAllMocks();
});

const foreignHost = 'rebound.example';

it('keeps the Server off the network on a fresh Server', async (): Promise<void> => {
  const { caller, url } = await startEngineTestHost();

  expect(await caller.network.localAccess()).toEqual({ enabled: false });
  expect(await reachable('127.0.0.1', portOf(url))).toBe(true);
});

it('rejects turning it on when the Server cannot bind, and stays on loopback and off', async (): Promise<void> => {
  const { caller, url } = await startEngineTestHost();
  const port = portOf(url);
  const own = await connect('127.0.0.1', port);
  onTestFinished(() => own.close());
  refuseBinds(Server.prototype);

  await expect(
    caller.network.setLocalAccess({ enabled: true }),
  ).rejects.toThrow('in use');

  expect(await caller.network.localAccess()).toEqual({ enabled: false });
  expect(own.readyState).toBe(WebSocket.OPEN);
  expect(await reachable('127.0.0.1', port)).toBe(true);
  await caller.network.setLocalAccess({ enabled: true });
  expect(await caller.network.localAccess()).toEqual({ enabled: true });
});

it('keeps the Host check for a Connection from this computer, on or off', async (): Promise<void> => {
  const { caller, url } = await startEngineTestHost();
  const port = portOf(url);

  expect(await upgradeStatus('127.0.0.1', port, { host: foreignHost })).toBe(
    403,
  );
  await caller.network.setLocalAccess({ enabled: true });
  expect(await upgradeStatus('127.0.0.1', port, { host: foreignHost })).toBe(
    403,
  );
  expect(await upgradeStatus('127.0.0.1', port)).toBe(101);
});

it('refuses a change that races the Server closing', async (): Promise<void> => {
  const { caller, stop } = await startEngineTestHost();
  const closing = stop();
  const change = caller.network.setLocalAccess({ enabled: true });

  const refusal = change.then(
    (): string => 'the change was accepted',
    (error: Error): string => error.message,
  );

  await closing;

  expect(await refusal).toMatch(/closing/);
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

  it('does not match the Host of a Connection from the network while on, and still checks its Origin', async (): Promise<void> => {
    const { caller, url } = await startEngineTestHost();
    const port = portOf(url);

    await caller.network.setLocalAccess({ enabled: true });

    expect(await upgradeStatus(lanAddress, port, { host: foreignHost })).toBe(
      101,
    );
    expect(
      await upgradeStatus(lanAddress, port, { origin: 'https://evil.example' }),
    ).toBe(403);
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
