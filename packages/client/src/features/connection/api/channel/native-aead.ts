import type { Aead, AeadParams } from './aead';
import { concatBytes } from './bytes';

const tagBytes = 16;

/*
 * What a native cipher hands back. react-native-quick-crypto returns a `Buffer` (a `Uint8Array`) from `update`, `final` and `getAuthTag`; an `ArrayBuffer` is accepted too, so a library that returns raw buffers works unchanged.
 */
type Chunk = Uint8Array | ArrayBuffer;

interface Transform {
  setAAD(associated: Uint8Array): object;
  update(data: Uint8Array): Chunk;
  final(): Chunk;
}

export interface Sealer extends Transform {
  getAuthTag(): Chunk;
}

export interface Opener extends Transform {
  setAuthTag(tag: Uint8Array): object;
}

/*
 * The two Node-style ciphers the channel needs, keyed and ready, for ChaCha20-Poly1305 with a 16-byte tag. `react-native-quick-crypto` fills it on a phone and `node:crypto` in tests; each is wired by plain functions, so the compiler checks the library's real types against it.
 */
export interface NativeCrypto {
  createSealer(key: Uint8Array, nonce: Uint8Array): Sealer;
  createOpener(key: Uint8Array, nonce: Uint8Array): Opener;
}

const bytesOf = (chunk: Chunk): Uint8Array =>
  chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);

export const nativeAead = (crypto: NativeCrypto): Aead => ({
  seal: (params: AeadParams, plaintext) => {
    const cipher = crypto.createSealer(params.key, params.nonce);

    cipher.setAAD(params.associated);

    return concatBytes(
      bytesOf(cipher.update(plaintext)),
      bytesOf(cipher.final()),
      bytesOf(cipher.getAuthTag()),
    );
  },
  open: (params: AeadParams, record) => {
    if (record.length < tagBytes) {
      throw new Error('Record is too short to authenticate');
    }

    const body = record.subarray(0, record.length - tagBytes);
    const tag = record.subarray(record.length - tagBytes);
    const decipher = crypto.createOpener(params.key, params.nonce);

    decipher.setAAD(params.associated);
    decipher.setAuthTag(tag);

    try {
      return concatBytes(
        bytesOf(decipher.update(body)),
        bytesOf(decipher.final()),
      );
    } catch {
      throw new Error('Record failed to authenticate');
    }
  },
});
