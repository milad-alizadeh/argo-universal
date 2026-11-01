import { startEngineTestHost } from '@repo/engine/mocks';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  endpointOf,
  nodeChannelPlatform,
  pairedNodeDevice,
} from '../../../../mocks/node-channel-platform';
import type { Connection } from '../stores/connection';
import { openConnection } from './open-connection';

const closers: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  for (const close of closers.splice(0).reverse()) await close();
});

const notAllowed = (connection: Connection): Promise<void> =>
  vi.waitFor(() => expect(connection.state()).toBe('not-allowed'), {
    timeout: 5000,
  });

async function connectedDevice(): Promise<{
  host: Awaited<ReturnType<typeof startEngineTestHost>>;
  opened: ReturnType<typeof openConnection>;
}> {
  const host = await startEngineTestHost({ version: '1.2.3' });
  const paired = await pairedNodeDevice(host);

  const opened = openConnection(
    await endpointOf(host),
    nodeChannelPlatform(paired),
  );

  closers.push(opened.close);
  await vi.waitFor(() => expect(opened.connection.state()).toBe('open'), {
    timeout: 5000,
  });

  return { host, opened };
}

const settleMs = 300;

describe('a paired Server that unpairs this Device', () => {
  // The owner unpairs the Device on the computer, mid-Session: the Device says it was refused and stops trying.
  it('says Not allowed once the owner unpairs it, and stops trying', async (): Promise<void> => {
    const { host, opened } = await connectedDevice();
    const [, device] = await host.caller.devices.list();

    await host.caller.devices.unpair({ deviceId: device?.id ?? '' });

    await notAllowed(opened.connection);
    await new Promise((later) => setTimeout(later, settleMs));
    expect(opened.connection.state()).toBe('not-allowed');
  });

  it('says Not allowed after it unpairs itself, and the Server forgets it', async (): Promise<void> => {
    const { host, opened } = await connectedDevice();

    await opened.client.devices.unpairSelf.mutate();

    await notAllowed(opened.connection);
    expect(await host.caller.devices.list()).toHaveLength(1);
  });
});
