import { createCipheriv, createDecipheriv } from 'node:crypto';
import { noiseIkVector } from '@repo/engine/pairing-vector';
import { describe, expect, it } from 'vitest';
import { aead as noble, type AeadParams } from './aead';
import { bytesText, textBytes } from './bytes';
import { nativeAead, type NativeCrypto } from './native-aead';
import { startHandshake } from './noise-initiator';
import { keypairFromPrivateKey } from './x25519';

// @noble is the cipher the web runs and Node's crypto has the surface react-native-quick-crypto copies, so each is the other's reference.
const params: AeadParams = {
  key: Uint8Array.from({ length: 32 }, (_, index) => index),
  nonce: Uint8Array.from({ length: 12 }, (_, index) => index + 7),
  associated: Uint8Array.of(1, 2, 3),
};

const plaintext = new TextEncoder().encode('a record of the channel');

// Node's types ask for a plaintext length that only CCM uses.
const noPlaintextLength = { plaintextLength: 0 };

const algorithm = 'chacha20-poly1305';

const options = { authTagLength: 16 };

const arrayBufferOf = (chunk: Uint8Array | ArrayBuffer): ArrayBuffer =>
  new Uint8Array(chunk).buffer;

// `node:crypto` in the shape of react-native-quick-crypto, whose ciphers return a `Buffer` (a `Uint8Array`) from every call.
const bufferNativeCrypto: NativeCrypto = {
  createSealer: (key, nonce) => {
    const cipher = createCipheriv(algorithm, key, nonce, options);

    return {
      setAAD: (associated) => cipher.setAAD(associated, noPlaintextLength),
      update: (data) => cipher.update(data),
      final: () => cipher.final(),
      getAuthTag: () => cipher.getAuthTag(),
    };
  },
  createOpener: (key, nonce) => {
    const decipher = createDecipheriv(algorithm, key, nonce, options);

    return {
      setAAD: (associated) => decipher.setAAD(associated, noPlaintextLength),
      setAuthTag: (tag) => decipher.setAuthTag(tag),
      update: (data) => decipher.update(data),
      final: () => decipher.final(),
    };
  },
};

// The same cipher handing back raw `ArrayBuffer`s, the other shape a native binding may return.
const arrayBufferNativeCrypto: NativeCrypto = {
  createSealer: (key, nonce) => {
    const cipher = bufferNativeCrypto.createSealer(key, nonce);

    return {
      setAAD: (associated) => cipher.setAAD(associated),
      update: (data) => arrayBufferOf(cipher.update(data)),
      final: () => arrayBufferOf(cipher.final()),
      getAuthTag: () => arrayBufferOf(cipher.getAuthTag()),
    };
  },
  createOpener: (key, nonce) => {
    const decipher = bufferNativeCrypto.createOpener(key, nonce);

    return {
      setAAD: (associated) => decipher.setAAD(associated),
      setAuthTag: (tag) => decipher.setAuthTag(tag),
      update: (data) => arrayBufferOf(decipher.update(data)),
      final: () => arrayBufferOf(decipher.final()),
    };
  },
};

const refused = 'failed to authenticate';

const tamper = (bytes: Uint8Array, at: number): Uint8Array => {
  const copy = Uint8Array.from(bytes);

  copy[at] = (copy[at] ?? 0) ^ 1;

  return copy;
};

describe.each([
  ['Buffer', bufferNativeCrypto],
  ['ArrayBuffer', arrayBufferNativeCrypto],
])('native cipher returning %s', (_returns, crypto) => {
  const native = nativeAead(crypto);

  it('seals what the JavaScript cipher opens', () => {
    expect(noble.open(params, native.seal(params, plaintext))).toEqual(
      plaintext,
    );
  });

  it('opens what the JavaScript cipher seals', () => {
    expect(native.open(params, noble.seal(params, plaintext))).toEqual(
      plaintext,
    );
  });

  it('seals the same bytes as the JavaScript cipher', () => {
    expect(native.seal(params, plaintext)).toEqual(
      noble.seal(params, plaintext),
    );
  });

  it('seals and opens an empty record', () => {
    const empty = new Uint8Array(0);
    const record = native.seal(params, empty);

    expect(record).toHaveLength(16);
    expect(record).toEqual(noble.seal(params, empty));
    expect(native.open(params, record)).toEqual(empty);
  });

  it('seals and opens a payload of several megabytes', () => {
    const large = Uint8Array.from(
      { length: 3 * 1024 * 1024 },
      (_, i) => i % 251,
    );

    const record = native.seal(params, large);

    expect(Buffer.from(noble.open(params, record)).equals(large)).toBe(true);
    expect(Buffer.from(native.open(params, record)).equals(large)).toBe(true);
  }, 60_000);

  it('refuses a record under other associated data', () => {
    const record = native.seal(params, plaintext);

    expect(() =>
      native.open({ ...params, associated: Uint8Array.of(9) }, record),
    ).toThrow(refused);
  });

  it('refuses a record under another nonce', () => {
    const record = native.seal(params, plaintext);

    expect(() =>
      native.open({ ...params, nonce: new Uint8Array(12) }, record),
    ).toThrow(refused);
  });

  it('refuses a record whose body was changed', () => {
    const record = native.seal(params, plaintext);

    expect(() => native.open(params, tamper(record, 0))).toThrow(refused);
  });

  it('refuses a record whose tag was changed', () => {
    const record = native.seal(params, plaintext);

    expect(() =>
      native.open(params, tamper(record, record.length - 1)),
    ).toThrow(refused);
  });

  it('refuses a record shorter than its tag', () => {
    expect(() => native.open(params, new Uint8Array(4))).toThrow('too short');
  });
});

const hex = (data: Uint8Array): string =>
  [...data].map((byte) => byte.toString(16).padStart(2, '0')).join('');

const bytes = (text: string): Uint8Array =>
  Uint8Array.from(text.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));

describe.each([
  ['Buffer', bufferNativeCrypto],
  ['ArrayBuffer', arrayBufferNativeCrypto],
])(
  'the Noise vector through the native cipher returning %s',
  (_returns, crypto) => {
    it('seals and opens the vector records as the Server does', () => {
      const [opening, answering] = noiseIkVector.handshake;
      const [first, second] = noiseIkVector.records;

      const accepted = startHandshake(
        {
          deviceKey: keypairFromPrivateKey(
            bytes(noiseIkVector.initiatorStatic),
          ),
          serverPublicKey: bytes(noiseIkVector.responderPublicKey),
          claim: textBytes(opening.payload),
          randomBytes: () => {
            throw new Error('A vector fixes the ephemeral key');
          },
        },
        {
          ephemeral: keypairFromPrivateKey(
            bytes(noiseIkVector.initiatorEphemeral),
          ),
          prologue: textBytes(noiseIkVector.prologue),
          aead: nativeAead(crypto),
        },
      ).accept(bytes(answering.message));

      expect(bytesText(accepted.welcome)).toBe(answering.payload);
      expect(hex(accepted.cipher.seal(textBytes(first.payload)))).toBe(
        first.message,
      );
      expect(bytesText(accepted.cipher.open(bytes(second.message)))).toBe(
        second.payload,
      );
    });
  },
);
