import type { CipherPosition, CipherState } from './cipher-state';

const noAssociatedData = new Uint8Array(0);

// The finished channel: one numbered stream of records out and one in, each with its own key.
export class ChannelCipher {
  public constructor(
    private readonly sending: CipherState,
    private readonly receiving: CipherState,
  ) {}

  // Both directions as they stand, for a module that carries the channel on natively from the next record.
  public position(): {
    sending: CipherPosition;
    receiving: CipherPosition;
  } {
    return {
      sending: this.sending.position(),
      receiving: this.receiving.position(),
    };
  }

  public seal(plaintext: Uint8Array): Uint8Array {
    return this.sending.seal(noAssociatedData, plaintext);
  }

  public open(record: Uint8Array): Uint8Array {
    return this.receiving.open(noAssociatedData, record);
  }
}
