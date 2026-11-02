import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { keyHashOf, keyHostLabelOf, toDiscoveredServer } from './discovery';

const digestOf = (key: string): Buffer =>
  createHash('sha256').update(key).digest();

describe('the key hash an announcement carries', () => {
  const key = 'q3SfKk2o0y0m5wq0jW1u0m3b2L9vYQp8Zt1kZ4cXG1A';

  // The digests of `key-3` and `key-0` hold a character base64 spells `+` and `/`, which base64url must replace.
  it.each([key, 'key-3', 'key-0'])(
    'is the first 16 bytes of the digest of %s, base64url',
    (publicKey): void => {
      const expected = digestOf(publicKey).subarray(0, 16);

      expect(keyHashOf(publicKey)).toBe(expected.toString('base64url'));
      expect(keyHashOf(publicKey)).toHaveLength(22);
      expect(keyHashOf(publicKey)).toMatch(/^[\w-]+$/);
    },
  );

  it('is the hex of the same digest in the host label, which holds no underscore', (): void => {
    expect(keyHostLabelOf('key-0')).toBe(
      digestOf('key-0').subarray(0, 16).toString('hex'),
    );
    expect(keyHostLabelOf('key-0')).toHaveLength(32);
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
