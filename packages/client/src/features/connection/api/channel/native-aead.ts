import type { Aead, AeadParams } from './aead';
import { concatBytes } from './bytes';

const tagBytes = 16;

interface Transform {
  setAAD: (associated: Uint8Array) => object;
  update: (data: Uint8Array) => Uint8Array;
  final: () => Uint8Array;
}

interface Sealer extends Transform {
  getAuthTag: () => Uint8Array;
}

interface Opener extends Transform {
  setAuthTag: (tag: Uint8Array) => object;
}

interface CipherOptions {
  authTagLength: number;
}

type CipherArguments = [
  algorithm: 'chacha20-poly1305',
  key: Uint8Array,
  nonce: Uint8Array,
  options: CipherOptions,
];

/*
 * The slice of a Node-style crypto module that the channel uses: `react-native-quick-crypto` on a phone, `node:crypto` in tests.
 */
export interface NativeModule {
  createCipheriv: unknown;
  createDecipheriv: unknown;
}

export interface NativeCrypto {
  createCipheriv: (...args: CipherArguments) => Sealer;
  createDecipheriv: (...args: CipherArguments) => Opener;
}

const options: CipherOptions = { authTagLength: tagBytes };

/*
 * The libraries type these calls as overloads that one signature cannot express, so a caller states once, at the seam, that the module is the chacha20-poly1305 slice.
 */
export const asNativeCrypto = (module: NativeModule): NativeCrypto =>
  /* SAFETY: both react-native-quick-crypto and node:crypto export createCipheriv and createDecipheriv with the Node signature for 'chacha20-poly1305'; native-aead.test.ts runs the Node one against @noble. */
  // oxlint-disable-next-line typescript/consistent-type-assertions
  module as NativeCrypto;

export const nativeAead = (crypto: NativeCrypto): Aead => ({
  seal: (params: AeadParams, plaintext) => {
    const cipher = crypto.createCipheriv(
      'chacha20-poly1305',
      params.key,
      params.nonce,
      options,
    );

    cipher.setAAD(params.associated);

    return concatBytes(
      new Uint8Array(cipher.update(plaintext)),
      new Uint8Array(cipher.final()),
      new Uint8Array(cipher.getAuthTag()),
    );
  },
  open: (params: AeadParams, record) => {
    if (record.length < tagBytes) {
      throw new Error('Record is too short to authenticate');
    }

    const decipher = crypto.createDecipheriv(
      'chacha20-poly1305',
      params.key,
      params.nonce,
      options,
    );

    decipher.setAAD(params.associated);
    decipher.setAuthTag(record.subarray(record.length - tagBytes));

    try {
      return concatBytes(
        new Uint8Array(
          decipher.update(record.subarray(0, record.length - tagBytes)),
        ),
        new Uint8Array(decipher.final()),
      );
    } catch {
      throw new Error('Record failed to authenticate');
    }
  },
});
