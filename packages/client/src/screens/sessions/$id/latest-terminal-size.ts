type Size = { columns: number; rows: number };

type SendSize = (size: Size) => Promise<void>;

// A resize underway must settle before its replacement. While it runs, only the final size matters.
export class LatestTerminalSize {
  private next?: Size;

  private sending = false;

  public request(size: Size, send: SendSize): void {
    this.next = size;

    if (!this.sending) void this.flush(send);
  }

  private async flush(send: SendSize): Promise<void> {
    this.sending = true;

    try {
      while (this.next) {
        const size = this.next;
        this.next = undefined;

        await send(size);
      }
    } finally {
      this.sending = false;
    }
  }
}
