import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { z } from 'zod';
import type { RpcConnection } from './connection';
import { serverDeviceIdentity, type RpcIdentity } from './identity';
import { publicProcedure, router, serverDeviceProcedure } from './trpc';

// Two procedures standing for every procedure of every router: each comes from one of these two gates.
const probe = router({
  answer: publicProcedure.output(z.string()).query(() => 'answered'),
  serverDeviceAnswer: serverDeviceProcedure
    .output(z.string())
    .query(() => 'answered'),
});

const connection = (identity: RpcIdentity | undefined): RpcConnection => ({
  id: randomUUID(),
  signal: new AbortController().signal,
  identity,
});

const ask = (identity?: RpcIdentity): Promise<string> =>
  probe.createCaller({ connection: connection(identity) }).answer();

const askAsServerDevice = (identity?: RpcIdentity): Promise<string> =>
  probe.createCaller({ connection: connection(identity) }).serverDeviceAnswer();

it('answers the Server Device and a paired Device alike', async (): Promise<void> => {
  expect(await ask(serverDeviceIdentity)).toBe('answered');
  expect(await ask({ serverDevice: false, deviceId: 'paired' })).toBe(
    'answered',
  );
});

it('refuses a Connection that has proved nothing', async (): Promise<void> => {
  await expect(ask()).rejects.toThrow(/proved which Device/);
});

it("answers the Server Device alone when a procedure is the Server Device's", async (): Promise<void> => {
  expect(await askAsServerDevice(serverDeviceIdentity)).toBe('answered');
});

it('refuses a Paired Device with a FORBIDDEN the App can draw', async (): Promise<void> => {
  await expect(
    askAsServerDevice({ serverDevice: false, deviceId: 'paired' }),
  ).rejects.toMatchObject({
    code: 'FORBIDDEN',
    message: 'Only the Server Device may do this',
  });
});

it('refuses a Connection that has proved nothing before asking which Device it is', async (): Promise<void> => {
  await expect(askAsServerDevice()).rejects.toThrow(/proved which Device/);
});
