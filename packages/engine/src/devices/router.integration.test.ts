import { readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

const keyFilename = 'server.key';

it('gives a fresh Server exactly one Device, its own Server Device', async (): Promise<void> => {
  const { caller } = await startEngineTestHost();
  const devices = await caller.devices.list();

  expect(devices).toEqual([
    expect.objectContaining({
      serverDevice: true,
      name: (await caller.system.info()).name,
      publicKey: (await caller.devices.serverKey()).publicKey,
    }),
  ]);
});

it('keeps the Server Device row and the static key across an Engine restart', async (): Promise<void> => {
  const first = await startEngineTestHost();
  const devices = await first.caller.devices.list();
  const { publicKey } = await first.caller.devices.serverKey();
  await first.stop();

  const { caller } = await startEngineTestHost({ home: first.home });

  expect(await caller.devices.list()).toEqual(devices);
  expect((await caller.devices.serverKey()).publicKey).toBe(publicKey);
});

it('gives a separate Server its own key', async (): Promise<void> => {
  const first = await startEngineTestHost();
  const second = await startEngineTestHost();

  expect((await second.caller.devices.serverKey()).publicKey).not.toBe(
    (await first.caller.devices.serverKey()).publicKey,
  );
});

it('makes the Server Device follow a regenerated static key', async (): Promise<void> => {
  const first = await startEngineTestHost();
  const before = (await first.caller.devices.serverKey()).publicKey;
  await first.stop();
  await rm(join(first.home, keyFilename));

  const { caller } = await startEngineTestHost({ home: first.home });
  const { publicKey } = await caller.devices.serverKey();
  const devices = await caller.devices.list();

  expect(publicKey).not.toBe(before);
  expect(devices).toEqual([
    expect.objectContaining({ serverDevice: true, publicKey }),
  ]);
});

// The private half in every encoding someone might return it in.
const encodingsOf = (pem: string): string[] => {
  const der = Buffer.from(
    pem
      .split('\n')
      .filter((line) => line && !line.startsWith('-----'))
      .join(''),
    'base64',
  );

  const raw = der.subarray(-32);

  return [der, raw].flatMap((bytes) => [
    bytes.toString('base64'),
    bytes.toString('base64url'),
    bytes.toString('hex'),
  ]);
};

it('writes the private half owner-only and returns it from no procedure', async (): Promise<void> => {
  const { caller, home } = await startEngineTestHost();
  const path = join(home, keyFilename);

  expect((await stat(path)).mode & 0o777).toBe(0o600);

  const answers = JSON.stringify([
    await caller.devices.list(),
    await caller.devices.serverKey(),
    await caller.system.info(),
  ]);

  for (const encoding of encodingsOf(await readFile(path, 'utf8')))
    expect(answers).not.toContain(encoding);
});
