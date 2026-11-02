import { chacha20poly1305 } from '@noble/ciphers/chacha.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { concatBytes } from './bytes';

export const tagBytes = 16;

const nonceBytes = 12;

const counterOffset = 4;

/*
 * The Noise key derivation: one chaining key and some fresh material in, two keys out (Noise spec, section 4.3).
 * The same derivation the Server runs on `node:crypto`; the published vector in the tests is what says the two agree.
 */
export function deriveKeys(
  chainingKey: Uint8Array,
  material: Uint8Array,
): readonly [Uint8Array, Uint8Array] {
  const temporary = hmac(sha256, chainingKey, material);
  const first = hmac(sha256, temporary, Uint8Array.of(1));

  return [first, hmac(sha256, temporary, concatBytes(first, Uint8Array.of(2)))];
}

const nonceFor = (records: bigint): Uint8Array => {
  const nonce = new Uint8Array(nonceBytes);
  new DataView(nonce.buffer).setBigUint64(counterOffset, records, true);

  return nonce;
};

/*
 * One direction's key and its record number, counted from zero and never reused (ADR-0045). The number is not on the wire: a record that does not open under the number this side has reached ends the Connection.
 */
export class CipherState {
  private records = 0n;

  public constructor(private key?: Uint8Array) {}

  public rekey(key: Uint8Array): void {
    this.key = key;
    this.records = 0n;
  }

  public seal(associated: Uint8Array, plaintext: Uint8Array): Uint8Array {
    return this.cipher(associated).encrypt(plaintext);
  }

  public open(associated: Uint8Array, record: Uint8Array): Uint8Array {
    return this.cipher(associated).decrypt(record);
  }

  private cipher(associated: Uint8Array): ReturnType<typeof chacha20poly1305> {
    if (!this.key) throw new Error('The channel has no key yet');
    const nonce = nonceFor(this.records);
    this.records += 1n;

    return chacha20poly1305(this.key, nonce, associated);
  }
}
