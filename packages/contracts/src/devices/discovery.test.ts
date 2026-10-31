import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { keyHashOf, toDiscoveredServer } from './discovery';
import { sha256 } from './sha256';

const lengths = [0, 1, 55, 56, 63, 64, 65, 119, 120, 128, 1000];

describe('sha256', () => {
  it.each(lengths)('agrees with Node on %i bytes', (length): void => {
    const bytes = Uint8Array.from({ length }, (_, index) => (index * 7) % 256);

    expect(Buffer.from(sha256(bytes))).toEqual(
      createHash('sha256').update(bytes).digest(),
    );
  });
});

describe('the key hash an announcement carries', () => {
  const key = 'q3SfKk2o0y0m5wq0jW1u0m3b2L9vYQp8Zt1kZ4cXG1A';

  it('is the first 16 bytes of the key digest, base64url', (): void => {
    const digest = createHash('sha256').update(key).digest();

    expect(keyHashOf(key)).toBe(digest.subarray(0, 16).toString('base64url'));
    expect(keyHashOf(key)).toHaveLength(22);
  });

  it('tells one key from another and never contains the key', (): void => {
    expect(keyHashOf(key)).not.toBe(keyHashOf(`${key}x`));
    expect(keyHashOf(key)).not.toContain(key);
  });

  it('is what an App reads back from the announcement', (): void => {
    const server = toDiscoveredServer({
      name: 'Studio Mac',
      txt: { keyhash: keyHashOf(key) },
      addresses: [],
      port: 4000,
    });

    expect(server?.keyHash).toBe(keyHashOf(key));
  });

  it('lists no announcement without a hash', (): void => {
    expect(
      toDiscoveredServer({
        name: 'x',
        txt: {},
        addresses: [],
        port: 1,
      }),
    ).toBeUndefined();
  });
});
