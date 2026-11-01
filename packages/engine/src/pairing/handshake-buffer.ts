const headerBytes = 2;

// A real first message is a few hundred bytes: two keys, a tag, and a claim with a name and a six-digit code. Anything that claims more is not one, and the Server does not wait for the rest of it.
export const maxFirstMessageBytes = 4096;

export type FirstMessage = { handshake: Buffer; rest: Buffer };

/*
 * The bytes of a handshake's first message as they arrive, kept as the chunks TCP delivered and joined once, when all of them are here. Joining everything received for every chunk would copy the same bytes again and again.
 * The two-byte length that opens it says how much is coming, and a length that is too large is refused at once, not waited for.
 */
export class HandshakeBuffer {
  private readonly chunks: Buffer[] = [];
  private size = 0;
  private claimed: number | undefined;

  // The message once all of it has arrived; whatever follows it is the first of the channel's records.
  public push(chunk: Buffer): FirstMessage | undefined {
    this.chunks.push(chunk);
    this.size += chunk.length;
    const length = this.length();

    if (length === undefined || this.size < headerBytes + length)
      return undefined;
    const received = Buffer.concat(this.chunks);

    return {
      handshake: received.subarray(headerBytes, headerBytes + length),
      rest: received.subarray(headerBytes + length),
    };
  }

  // Read once, the first time the header is all here.
  private length(): number | undefined {
    this.claimed ??= this.readHeader();

    return this.claimed;
  }

  private readHeader(): number | undefined {
    if (this.size < headerBytes) return undefined;
    const claimed = Buffer.concat(this.chunks).readUInt16BE(0);

    if (claimed > maxFirstMessageBytes)
      throw new Error(`A first message claims ${claimed} bytes`);

    return claimed;
  }
}
