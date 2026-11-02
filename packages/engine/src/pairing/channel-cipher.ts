import type { CipherState } from './cipher-state';

const noAssociatedData = Buffer.alloc(0);

// The finished channel: one numbered stream of records out and one in, each with its own key, so neither direction's records can be fed back into the other.
export class ChannelCipher {
  public constructor(
    private readonly sending: CipherState,
    private readonly receiving: CipherState,
  ) {}

  public seal(plaintext: Buffer): Buffer {
    return this.sending.seal(noAssociatedData, plaintext);
  }

  public open(record: Buffer): Buffer {
    return this.receiving.open(noAssociatedData, record);
  }
}
