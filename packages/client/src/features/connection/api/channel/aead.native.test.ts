import { chacha20poly1305 } from '@noble/ciphers/chacha.js';
import { describe, expect, it } from 'vitest';
import type { AeadParams } from './aead';
import { aead } from './aead.native';

// Runs over `node:crypto`, which has the surface react-native-quick-crypto copies. @noble is the cipher the web runs, so each is the other's reference.
const params: AeadParams = {
  key: Uint8Array.from({ length: 32 }, (_, index) => index),
  nonce: Uint8Array.from({ length: 12 }, (_, index) => index + 7),
  associated: Uint8Array.of(1, 2, 3),
};

const plaintext = new TextEncoder().encode('a record of the channel');

const noble = ({
  key,
  nonce,
  associated,
}: AeadParams): ReturnType<typeof chacha20poly1305> =>
  chacha20poly1305(key, nonce, associated);

const refused = 'failed to authenticate';

const tamper = (bytes: Uint8Array, at: number): Uint8Array => {
  const copy = Uint8Array.from(bytes);

  copy[at] = (copy[at] ?? 0) ^ 1;

  return copy;
};

describe('the native cipher', () => {
  it('seals what the JavaScript cipher opens', () => {
    expect(noble(params).decrypt(aead.seal(params, plaintext))).toEqual(
      plaintext,
    );
  });

  it('opens what the JavaScript cipher seals', () => {
    expect(aead.open(params, noble(params).encrypt(plaintext))).toEqual(
      plaintext,
    );
  });

  it('seals the same bytes as the JavaScript cipher', () => {
    expect(aead.seal(params, plaintext)).toEqual(
      noble(params).encrypt(plaintext),
    );
  });

  it('seals and opens an empty record', () => {
    const empty = new Uint8Array(0);
    const record = aead.seal(params, empty);

    expect(record).toHaveLength(16);
    expect(record).toEqual(noble(params).encrypt(empty));
    expect(aead.open(params, record)).toEqual(empty);
  });

  it('seals and opens a payload of several megabytes', () => {
    const large = Uint8Array.from(
      { length: 3 * 1024 * 1024 },
      (_, i) => i % 251,
    );

    const record = aead.seal(params, large);

    expect(Buffer.from(noble(params).decrypt(record)).equals(large)).toBe(true);
    expect(Buffer.from(aead.open(params, record)).equals(large)).toBe(true);
  }, 60_000);

  it('refuses a record under other associated data', () => {
    const record = aead.seal(params, plaintext);

    expect(() =>
      aead.open({ ...params, associated: Uint8Array.of(9) }, record),
    ).toThrow(refused);
  });

  it('refuses a record under another nonce', () => {
    const record = aead.seal(params, plaintext);

    expect(() =>
      aead.open({ ...params, nonce: new Uint8Array(12) }, record),
    ).toThrow(refused);
  });

  it('refuses a record whose body was changed', () => {
    const record = aead.seal(params, plaintext);

    expect(() => aead.open(params, tamper(record, 0))).toThrow(refused);
  });

  it('refuses a record whose tag was changed', () => {
    const record = aead.seal(params, plaintext);

    expect(() => aead.open(params, tamper(record, record.length - 1))).toThrow(
      refused,
    );
  });

  it('refuses a record shorter than its tag', () => {
    expect(() => aead.open(params, new Uint8Array(4))).toThrow('too short');
  });
});
