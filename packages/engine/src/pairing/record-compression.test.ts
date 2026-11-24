import { deflateRawSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { compressionThreshold, packRecord } from './record-compression';

const stored = 0;

const deflated = 1;

const lead = async (message: Buffer): Promise<number | undefined> =>
  (await packRecord(message))[0];

it('sends a message of 1023 bytes as it is, though it would shrink', async () => {
  expect(compressionThreshold).toBe(1024);
  expect(await lead(Buffer.alloc(1023, 97))).toBe(stored);
});

it('deflates a message of 1024 bytes that shrinks', async () => {
  expect(await lead(Buffer.alloc(1024, 97))).toBe(deflated);
});

// 58 bytes of one letter, then a fixed run of noise: it deflates to the same number of bytes it started with, so nothing is gained and it goes as it is.
it('sends a message that deflates to exactly its own size as it is', async () => {
  const message = Buffer.alloc(1100, 97);
  let seed = 12_345;

  for (let index = 58; index < message.length; index += 1) {
    seed = (seed * 1_103_515_245 + 12_345) & 0x7f_ff_ff_ff;
    message[index] = seed >> 16;
  }

  expect(deflateRawSync(message)).toHaveLength(message.length);
  expect(await packRecord(message)).toEqual(
    Buffer.concat([Buffer.of(stored), message]),
  );
});
