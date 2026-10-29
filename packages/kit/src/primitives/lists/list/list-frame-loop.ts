import { nextFrame, type Schedule } from './list-next-frame';

// Runs a step every frame until stopped.
export class FrameLoop {
  private cancelNext: (() => void) | undefined;

  public constructor(private readonly schedule: Schedule = nextFrame) {}

  public start(step: () => void): void {
    this.stop();

    const next = (): void => {
      step();
      this.cancelNext = this.schedule(next);
    };

    this.cancelNext = this.schedule(next);
  }

  public stop(): void {
    this.cancelNext?.();
    this.cancelNext = undefined;
  }
}
