import { createCipheriv, createDecipheriv, createHmac } from 'node:crypto';

const algorithm = 'chacha20-poly1305';

export const tagBytes = 16;

const nonceBytes = 12;

const counterOffset = 4;

const hmac = (key: Buffer, data: Buffer): Buffer =>
  createHmac('sha256', key).update(data).digest();

/*
 * The Noise key derivation: one chaining key and some fresh material in, two keys out (Noise spec, section 4.3).
 * The first stays the chaining key for the next step, so every key the channel ends up with depends on the whole exchange before it.
 */
export function deriveKeys(
  chainingKey: Buffer,
  material: Buffer,
): readonly [Buffer, Buffer] {
  const temporary = hmac(chainingKey, material);
  const first = hmac(temporary, Buffer.of(1));

  return [first, hmac(temporary, Buffer.concat([first, Buffer.of(2)]))];
}

// The Noise spec reserves the largest 64-bit number, so a state stops one short of it with an error of its own.
const recordLimit = 2n ** 64n - 1n;

const nonceFor = (records: bigint): Buffer => {
  const nonce = Buffer.alloc(nonceBytes);
  nonce.writeBigUInt64LE(records, counterOffset);

  return nonce;
};

/*
 * One direction's key and its record number. The number starts at zero, counts up by one for every record, and is never reused or reset, so no record of a Connection repeats and none can be replayed into it (ADR-0045).
 * A key is set once the exchange has mixed one in; using the state before that is a bug in the exchange, not something a peer can provoke.
 */
export class CipherState {
  private records = 0n;

  /*
   * A key is fixed for the life of its state, and a fresh key means a fresh state, so a counter can never go back to zero under a key it has already used. Nonce reuse under one key is the one failure that breaks this design outright.
   */
  public constructor(
    private readonly key?: Buffer,
    private readonly limit: bigint = recordLimit,
  ) {}

  public seal(associated: Buffer, plaintext: Buffer): Buffer {
    const cipher = createCipheriv(algorithm, this.readKey(), this.nextNonce(), {
      authTagLength: tagBytes,
    });

    cipher.setAAD(associated, { plaintextLength: plaintext.length });

    return Buffer.concat([
      cipher.update(plaintext),
      cipher.final(),
      cipher.getAuthTag(),
    ]);
  }

  public open(associated: Buffer, record: Buffer): Buffer {
    const sealed = record.subarray(0, record.length - tagBytes);

    const decipher = createDecipheriv(
      algorithm,
      this.readKey(),
      this.nextNonce(),
      { authTagLength: tagBytes },
    );

    decipher.setAuthTag(record.subarray(sealed.length));
    decipher.setAAD(associated, { plaintextLength: sealed.length });

    return Buffer.concat([decipher.update(sealed), decipher.final()]);
  }

  private readKey(): Buffer {
    if (!this.key) throw new Error('The channel has no key yet');

    return this.key;
  }

  private nextNonce(): Buffer {
    if (this.records >= this.limit)
      throw new Error(
        'The channel has used every record number its key allows',
      );

    const nonce = nonceFor(this.records);
    this.records += 1n;

    return nonce;
  }
}
