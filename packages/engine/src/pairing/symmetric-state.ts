import { createHash } from 'node:crypto';
import { CipherState, deriveKeys } from './cipher-state';

/*
 * Noise_IK_25519_ChaChaPoly_SHA256, which is exactly 32 bytes long and therefore starts the running hash as it is (Noise spec, section 5.2).
 * IK is the pattern where the initiator already knows the responder's static public key and sends its own inside the first message: the shape ADR-0045 describes, with the Server's static key out of band in the QR and the Device Key arriving inside the completed handshake.
 */
const protocolName = 'Noise_IK_25519_ChaChaPoly_SHA256';

// Argo's own prologue, so an exchange meant for another protocol over the same bytes cannot be replayed into this one.
export const argoPrologue = Buffer.from('argo-pairing/1');

const sha256 = (data: Buffer): Buffer =>
  createHash('sha256').update(data).digest();

/*
 * The running hash and chaining key both sides keep while they exchange messages. Every piece of either message, and the Server's static public key before the first one, is mixed into the hash, so the two sides agree on the whole transcript or their keys do not match.
 * It knows nothing about who is connecting: the initiator and the responder drive it through the tokens of the pattern in the same order.
 */
export class SymmetricState {
  private hash: Buffer = Buffer.from(protocolName);
  private chainingKey: Buffer = Buffer.from(protocolName);
  private cipher = new CipherState();

  public constructor(serverPublicKey: Buffer, prologue: Buffer = argoPrologue) {
    this.mixHash(prologue);
    this.mixHash(serverPublicKey);
  }

  public mixHash(data: Buffer): void {
    this.hash = sha256(Buffer.concat([this.hash, data]));
  }

  public mixKey(material: Buffer): void {
    const [chainingKey, key] = deriveKeys(this.chainingKey, material);
    this.chainingKey = chainingKey;
    this.cipher = new CipherState(key);
  }

  public encryptAndHash(plaintext: Buffer): Buffer {
    const record = this.cipher.seal(this.hash, plaintext);
    this.mixHash(record);

    return record;
  }

  public decryptAndHash(record: Buffer): Buffer {
    const plaintext = this.cipher.open(this.hash, record);
    this.mixHash(record);

    return plaintext;
  }

  // The two directions of the finished channel: the first key is what the initiator sends with, the second what the responder sends with.
  public split(): readonly [CipherState, CipherState] {
    const [sending, receiving] = deriveKeys(this.chainingKey, Buffer.alloc(0));

    return [new CipherState(sending), new CipherState(receiving)];
  }
}
