import * as nodeCrypto from 'node:crypto';
import { expect, it } from 'vitest';
import { aead as noble } from './aead';
import { asNativeCrypto, nativeAead } from './native-aead';

// Node's crypto has the createCipheriv surface react-native-quick-crypto copies, and @noble is the cipher the web runs, so each is the other's reference.
const native = nativeAead(asNativeCrypto(nodeCrypto));

const params = {
  key: Uint8Array.from({ length: 32 }, (_, index) => index),
  nonce: Uint8Array.from({ length: 12 }, (_, index) => index + 7),
  associated: Uint8Array.of(1, 2, 3),
};

const plaintext = new TextEncoder().encode('a record of the channel');

it('seals what the JavaScript cipher opens', () => {
  expect(noble.open(params, native.seal(params, plaintext))).toEqual(plaintext);
});

it('opens what the JavaScript cipher seals', () => {
  expect(native.open(params, noble.seal(params, plaintext))).toEqual(plaintext);
});

it('seals the same bytes as the JavaScript cipher', () => {
  expect(native.seal(params, plaintext)).toEqual(noble.seal(params, plaintext));
});

it('refuses a record that was changed', () => {
  const record = native.seal(params, plaintext);

  record[0] = (record[0] ?? 0) ^ 1;

  expect(() => native.open(params, record)).toThrow('failed to authenticate');
});

it('refuses a record shorter than its tag', () => {
  expect(() => native.open(params, new Uint8Array(4))).toThrow('too short');
});
