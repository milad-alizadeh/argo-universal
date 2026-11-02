import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { connectAsDevice, openChannel } from '#mocks/engine-channel';
import { overOneChannel } from '#mocks/one-channel';

const warnings: Error[] = [];

process.on('warning', (warning): void => void warnings.push(warning));

it('serves many calls and then a subscription on the one channel a paired Device holds', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { ticket } = host.pairing.mint();
  const paired = await connectAsDevice(host, { ticket });

  const opened = await openChannel(host, { deviceKey: paired.deviceKey });
  const channel = overOneChannel(paired.channel, opened.socket);

  for (let call = 0; call < 25; call += 1)
    expect(await channel.caller.system.info.query()).toMatchObject({
      version: '1.2.3',
    });

  const stream = await channel.subscribe('/trpc/plugins.listChanges');

  expect(stream.statusCode).toBe(200);
  expect(stream.headers['content-type']).toContain('text/event-stream');
  expect(warnings.map((warning) => warning.name)).not.toContain(
    'MaxListenersExceededWarning',
  );
  channel.close();
});
