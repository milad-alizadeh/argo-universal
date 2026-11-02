import { sha256 } from '@noble/hashes/sha2.js';
import { concatBytes, textBytes } from './bytes';
import { CipherState, deriveKeys } from './cipher-state';

// Noise_IK_25519_ChaChaPoly_SHA256 is exactly 32 bytes long, so it starts the running hash as it is (Noise spec, section 5.2).
const protocolName = textBytes('Noise_IK_25519_ChaChaPoly_SHA256');

// Argo's own prologue; it must equal the Server's, byte for byte.
export const argoPrologue = textBytes('argo-pairing/1');

/*
 * The running hash and chaining key the initiator keeps while the two messages go by. The Server's `symmetric-state.ts` is the other half; the published Noise vector is what says they agree.
 */
export class SymmetricState {
  private hash: Uint8Array = protocolName;
  private chainingKey: Uint8Array = protocolName;
  private readonly cipher = new CipherState();

  public constructor(
    serverPublicKey: Uint8Array,
    prologue: Uint8Array = argoPrologue,
  ) {
    this.mixHash(prologue);
    this.mixHash(serverPublicKey);
  }

  public mixHash(data: Uint8Array): void {
    this.hash = sha256(concatBytes(this.hash, data));
  }

  public mixKey(material: Uint8Array): void {
    const [chainingKey, key] = deriveKeys(this.chainingKey, material);
    this.chainingKey = chainingKey;
    this.cipher.rekey(key);
  }

  public encryptAndHash(plaintext: Uint8Array): Uint8Array {
    const sealed = this.cipher.seal(this.hash, plaintext);
    this.mixHash(sealed);

    return sealed;
  }

  public decryptAndHash(record: Uint8Array): Uint8Array {
    const opened = this.cipher.open(this.hash, record);
    this.mixHash(record);

    return opened;
  }

  // The first key is what the initiator sends with, the second what the responder sends with.
  public split(): readonly [CipherState, CipherState] {
    const [sending, receiving] = deriveKeys(
      this.chainingKey,
      new Uint8Array(0),
    );

    return [new CipherState(sending), new CipherState(receiving)];
  }
}
