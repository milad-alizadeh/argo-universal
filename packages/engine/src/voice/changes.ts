import type { VoiceCallActorRef } from './call.machine';

// Wakes a reader each time the call's standing changes, and once the stream is over.
export class Changes {
  private dirty = false;
  private wake: (() => void) | undefined;
  private readonly subscription;

  public constructor(
    actor: VoiceCallActorRef,
    private readonly signal: AbortSignal,
  ) {
    this.subscription = actor.subscribe(() => this.notify());
    signal.addEventListener('abort', () => this.notify(), { once: true });
  }

  public async next(): Promise<boolean> {
    if (!this.dirty && !this.signal.aborted)
      await new Promise<void>((resolve) => {
        this.wake = resolve;
      });
    this.dirty = false;

    return !this.signal.aborted;
  }

  public stop(): void {
    this.subscription.unsubscribe();
  }

  private notify(): void {
    this.dirty = true;
    this.wake?.();
  }
}
