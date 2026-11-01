import { x25519 } from '@noble/curves/ed25519.js';
import { bytesBase64, concatBytes, hexBytes } from './bytes';

export const keyBytes = 32;

// The DER wrapper around a bare X25519 public key; the Server writes its static key as base64url of this and the 32 raw bytes (#1492).
const spkiPrefixBytes = 12;

// A key pair as the handshake uses it: the 32 private bytes and the 32 public bytes that go on the wire.
export interface Keypair {
  readonly privateKey: Uint8Array;
  readonly publicKey: Uint8Array;
}

export const keypairFromPrivateKey = (privateKey: Uint8Array): Keypair => ({
  privateKey,
  publicKey: x25519.getPublicKey(privateKey),
});

export const sharedSecret = (
  privateKey: Uint8Array,
  peerPublicKey: Uint8Array,
): Uint8Array => x25519.getSharedSecret(privateKey, peerPublicKey);

// The DER wrapper itself, so a key the Server offered can be written in the form the QR carries and the App stores.
const spkiPrefix = hexBytes('302a300506032b656e032100');

// A Server's static public key as the QR code carries it and the App stores it: base64url of the DER-wrapped 32 bytes.
export const storedPublicKey = (raw: Uint8Array): string =>
  bytesBase64(concatBytes(spkiPrefix, raw))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');

// The 32 bytes of a Server's static public key as the QR code carries it.
export function rawFromStoredPublicKey(stored: string): Uint8Array {
  const base64 = stored.replaceAll('-', '+').replaceAll('_', '/');
  const der = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

  if (der.length !== spkiPrefixBytes + keyBytes)
    throw new Error('A public key of the wrong length cannot be a Server key');

  return der.subarray(spkiPrefixBytes);
}
