import { chacha20poly1305 } from '@noble/ciphers/chacha.js';

export interface AeadParams {
  key: Uint8Array;
  nonce: Uint8Array;
  associated: Uint8Array;
}

export interface Aead {
  seal: (params: AeadParams, plaintext: Uint8Array) => Uint8Array;
  open: (params: AeadParams, record: Uint8Array) => Uint8Array;
}

/*
 * ChaCha20-Poly1305 on web and desktop: pure JavaScript, where a JIT keeps it fast enough. iOS and Android take `aead.native.ts`.
 */
export const aead: Aead = {
  seal: (params, plaintext) =>
    chacha20poly1305(params.key, params.nonce, params.associated).encrypt(
      plaintext,
    ),
  open: (params, record) =>
    chacha20poly1305(params.key, params.nonce, params.associated).decrypt(
      record,
    ),
};
