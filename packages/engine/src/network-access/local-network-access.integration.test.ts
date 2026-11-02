import { Server } from 'node:net';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { WebSocket } from 'ws';
import { startEngineTestHost } from '#mocks/engine';
import {
  channelClosed,
  connectAsDevice,
  openChannel,
} from '#mocks/engine-channel';
import {
  connect,
  lanAddress,
  reachable,
  refuseBinds,
  upgradeStatus,
} from '#mocks/engine-network';
import type { Keypair } from '../pairing/x25519';

const portOf = (url: string): number => Number(new URL(url).port);

afterEach(() => {
  vi.restoreAllMocks();
});

const foreignHost = 'rebound.example';

type TestHost = Awaited<ReturnType<typeof startEngineTestHost>>;

// The Device Key of a Device that paired over the local network, the way another Device does.
const pairedOverLan = async (host: TestHost): Promise<Keypair> => {
  const { ticket } = host.pairing.mint();

  const device = await connectAsDevice(host, { ticket, host: lanAddress });

  return device.deviceKey;
};

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

// The `Host` allowlist went with ADR-0045: the front door and the handshake are the gate, and `Origin` keeps a browser page out.
it('asks nothing of the Host of a Connection from this computer, on or off, and still checks its Origin', async (): Promise<void> => {
  const { caller, url } = await startEngineTestHost();
  const port = portOf(url);

  expect(await upgradeStatus('127.0.0.1', port, { host: foreignHost })).toBe(
    101,
  );
  await caller.network.setLocalAccess({ enabled: true });
  expect(await upgradeStatus('127.0.0.1', port, { host: foreignHost })).toBe(
    101,
  );
  expect(
    await upgradeStatus('127.0.0.1', port, { origin: 'https://evil.example' }),
  ).toBe(403);
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

  it('takes a paired Device while on and drops it again once off, without a restart', async (): Promise<void> => {
    const host = await startEngineTestHost();
    const port = portOf(host.url);
    await host.caller.network.setLocalAccess({ enabled: true });

    const deviceKey = await pairedOverLan(host);
    const remote = await openChannel(host, { deviceKey, host: lanAddress });
    const own = await connect('127.0.0.1', port);

    await host.caller.network.setLocalAccess({ enabled: false });
    await channelClosed(remote.socket);

    expect(await reachable(lanAddress, port)).toBe(false);
    expect(own.readyState).toBe(WebSocket.OPEN);
    expect(await reachable('127.0.0.1', port)).toBe(true);
  });

  // A WebSocket is plain HTTP until it is upgraded, so a Device on the network has nothing to upgrade.
  it('never upgrades a WebSocket from the network, whatever it sends', async (): Promise<void> => {
    const { caller, url } = await startEngineTestHost();
    const port = portOf(url);

    await caller.network.setLocalAccess({ enabled: true });

    expect(await upgradeStatus(lanAddress, port, { host: foreignHost })).toBe(
      0,
    );
    expect(await upgradeStatus(lanAddress, port)).toBe(0);
  });

  it('stays as the owner left it across a restart', async (): Promise<void> => {
    const first = await startEngineTestHost();
    await first.caller.network.setLocalAccess({ enabled: true });
    await first.stop();

    const second = await startEngineTestHost({ home: first.home });
    expect(await second.caller.network.localAccess()).toEqual({
      enabled: true,
    });

    const deviceKey = await pairedOverLan(second);
    await second.caller.network.setLocalAccess({ enabled: false });
    await second.stop();

    const third = await startEngineTestHost({ home: first.home });
    expect(await third.caller.network.localAccess()).toEqual({
      enabled: false,
    });
    await expect(
      openChannel(third, { deviceKey, host: lanAddress }),
    ).rejects.toThrow(/ECONNREFUSED/);
  });
});
