import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { z } from 'zod';
import type { RpcConnection } from './connection';
import { serverDeviceIdentity, type RpcIdentity } from './identity';
import { publicProcedure, router } from './trpc';

// One procedure standing for every procedure of every router: they all come from `publicProcedure`.
const probe = router({
  answer: publicProcedure.output(z.string()).query(() => 'answered'),
});

const connection = (identity: RpcIdentity | undefined): RpcConnection => ({
  id: randomUUID(),
  signal: new AbortController().signal,
  identity,
});

const ask = (identity?: RpcIdentity): Promise<string> =>
  probe.createCaller({ connection: connection(identity) }).answer();

it('answers the Server Device and a paired Device alike', async (): Promise<void> => {
  expect(await ask(serverDeviceIdentity)).toBe('answered');
  expect(await ask({ serverDevice: false, deviceId: 'paired' })).toBe(
    'answered',
  );
});

it('refuses a Connection that has proved nothing, and one with no Connection at all', async (): Promise<void> => {
  await expect(ask()).rejects.toThrow(/proved which Device/);
  await expect(probe.createCaller({}).answer()).rejects.toThrow(
    /proved which Device/,
  );
});
