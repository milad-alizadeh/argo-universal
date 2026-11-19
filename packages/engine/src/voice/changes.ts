import type { VoiceCallActorRef } from './call.machine';

// Where a change of the Voice settings is heard, which no Voice call's own change tells.
export interface SettingsChanges {
  listen: (listener: () => void) => () => void;
}

// Wakes a reader each time the call's standing changes, and once the stream is over.
export class Changes {
  private dirty = false;
  private wake: (() => void) | undefined;
  private readonly subscription;
  private readonly unlisten: () => void;

  public constructor(
    actor: VoiceCallActorRef,
    private readonly signal: AbortSignal,
    settings: SettingsChanges,
  ) {
    this.subscription = actor.subscribe(() => this.notify());
    this.unlisten = settings.listen(() => this.notify());
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
    this.unlisten();
  }

  private notify(): void {
    this.dirty = true;
    this.wake?.();
  }
}
