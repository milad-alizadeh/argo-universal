import { chacha20poly1305 } from '@noble/ciphers/chacha.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { concatBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { domain, type GroupElement } from './group';

// Both sides' view of one run's transcript: the `sid` and the two elements exchanged.
export interface Transcript {
  readonly sid: Uint8Array;
  readonly device: Uint8Array;
  readonly server: Uint8Array;
}

export interface SessionKeys {
  // Seals what the Server offers under this code, once.
  readonly seal: Uint8Array;
  // Proves to the Server that the Device derived the same secret.
  readonly confirm: Uint8Array;
}

const keyBytes = 32;

const nonceBytes = 12;

const noNonce = new Uint8Array(nonceBytes);

const confirmLabel = utf8ToBytes('device-confirms');

/*
 * The keys a run's shared element gives, bound to its whole transcript. Each run has its own, and each is used for one message, so a fixed nonce is never reused under a key.
 */
export function sessionKeys(
  shared: GroupElement,
  transcript: Transcript,
): SessionKeys {
  const info = concatBytes(domain, transcript.device, transcript.server);

  const keys = hkdf(
    sha512,
    shared.toBytes(),
    transcript.sid,
    info,
    2 * keyBytes,
  );

  return { seal: keys.subarray(0, keyBytes), confirm: keys.subarray(keyBytes) };
}

const associated = (transcript: Transcript): Uint8Array =>
  concatBytes(transcript.sid, transcript.device, transcript.server);

export const sealOffer = (
  keys: SessionKeys,
  transcript: Transcript,
  plaintext: Uint8Array,
): Uint8Array =>
  chacha20poly1305(keys.seal, noNonce, associated(transcript)).encrypt(
    plaintext,
  );

// Throws when the offer was not sealed under these keys, which is how a wrong code shows.
export const openOffer = (
  keys: SessionKeys,
  transcript: Transcript,
  sealed: Uint8Array,
): Uint8Array =>
  chacha20poly1305(keys.seal, noNonce, associated(transcript)).decrypt(sealed);

export const confirmation = (
  keys: SessionKeys,
  transcript: Transcript,
): Uint8Array =>
  hmac(sha256, keys.confirm, concatBytes(confirmLabel, associated(transcript)));
