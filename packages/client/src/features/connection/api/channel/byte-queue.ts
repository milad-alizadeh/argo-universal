import { concatBytes } from './bytes';

// Bytes that have arrived and not yet been read. A chunk is kept as it came, so a message that arrives in many small chunks is joined once, when it is whole, and not again on every chunk.
export class ByteQueue {
  private readonly chunks: Uint8Array[] = [];
  private total = 0;

  public get length(): number {
    return this.total;
  }

  public push(chunk: Uint8Array): void {
    if (chunk.length === 0) return;
    this.chunks.push(chunk);
    this.total += chunk.length;
  }

  // The first `count` bytes, or fewer if fewer are here, left in the queue.
  public peek(count: number): Uint8Array {
    const pieces: Uint8Array[] = [];
    let left = count;

    for (const chunk of this.chunks) {
      if (left <= 0) break;
      pieces.push(chunk.subarray(0, left));
      left -= chunk.length;
    }

    return concatBytes(...pieces);
  }

  // Removes and returns the first `count` bytes, or fewer if fewer are here.
  public take(count: number): Uint8Array {
    const bytes = this.peek(count);
    this.drop(bytes.length);

    return bytes;
  }

  private drop(count: number): void {
    let left = count;
    let whole = 0;

    for (const chunk of this.chunks) {
      if (chunk.length > left) break;
      left -= chunk.length;
      whole += 1;
    }

    this.chunks.splice(0, whole);

    const [first] = this.chunks;

    if (first) this.chunks[0] = first.subarray(left);
    this.total -= count;
  }
}
