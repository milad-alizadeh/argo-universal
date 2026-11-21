import type { RunOutput, RunOutputCursor } from '@repo/contracts';
import type { RunOutputSource } from './run-terminal-props';

const capacity = 8;

type Respond = (frame: RunOutput | null) => void;

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
