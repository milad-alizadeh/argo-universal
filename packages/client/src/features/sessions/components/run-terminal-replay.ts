import type { RunOutput, RunOutputCursor } from '@repo/contracts';
import type { RunOutputSource } from './run-terminal-props';

const capacity = 8;

type Respond = (frame: RunOutput | null) => void;

type AcceptedFrame = {
  cursor: RunOutputCursor;
  reset: boolean;
  bytes: Uint8Array;
};

// The same recording can be supplied twice after reconnect. A new recording resets even at offset zero.
export function terminalFrame(
  previous: RunOutputCursor | undefined,
  { cursor, data }: RunOutput,
): AcceptedFrame | undefined {
  const sameRun = previous?.runId === cursor.runId;

  if (sameRun && cursor.offset <= previous.offset) return undefined;

  const bytes = Uint8Array.from(atob(data), (byte) => byte.charCodeAt(0));

  const overlap = sameRun
    ? previous.offset - (cursor.offset - bytes.length)
    : 0;

  return {
    cursor,
    reset: !sameRun,
    bytes: bytes.subarray(Math.max(0, overlap)),
  };
}

type Read = (cursor: RunOutputCursor | null) => Promise<RunOutput | null>;

const retryMs = 100;

// Resume a pull transport after the last frame the Terminal actually accepted.
export function readTerminalFrames(
  read: Read,
  cursor: RunOutputCursor | undefined,
  receive: Parameters<RunOutputSource>[1],
): () => void {
  let active = true;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let next = cursor ?? null;

  async function pump(): Promise<void> {
    const frame = await read(next).catch(() => null);

    if (!active) return;

    if (!frame) {
      retry = setTimeout(() => void pump(), retryMs);

      return;
    }

    next = receive(frame) ?? next;
    void pump();
  }

  void pump();

  return (): void => {
    active = false;
    clearTimeout(retry);
  };
}

// Keeps the DOM bridge bounded. If the reader falls behind, its next read resumes from the recording.
export class RunTerminalReplay {
  private source?: RunOutputSource;

  private frames: RunOutput[] = [];

  private pending?: Respond;

  private unsubscribe?: () => void;

  private revision = 0;

  public connect(source?: RunOutputSource): void {
    this.stop();
    this.source = source;
  }

  public async read(cursor: RunOutputCursor | null): Promise<RunOutput | null> {
    const frame = this.frames.shift();

    if (frame) return frame;

    if (!this.source) return null;

    this.pending?.(null);

    return new Promise((resolve) => {
      this.pending = resolve;

      if (!this.unsubscribe && this.source)
        this.subscribe(this.source, cursor ?? undefined);
    });
  }

  private subscribe(
    source: RunOutputSource,
    cursor: RunOutputCursor | undefined,
  ): void {
    const revision = this.revision;

    const unsubscribe = source(cursor, (frame) => {
      if (revision === this.revision) this.receive(frame);
    });

    if (revision === this.revision) this.unsubscribe = unsubscribe;
    else unsubscribe();
  }

  private receive(frame: RunOutput): void {
    const pending = this.pending;
    this.pending = undefined;

    if (pending) pending(frame);
    else if (this.frames.length < capacity) this.frames.push(frame);
    else this.stop();
  }

  private stop(): void {
    this.revision += 1;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.frames = [];
    this.pending?.(null);
    this.pending = undefined;
  }
}
