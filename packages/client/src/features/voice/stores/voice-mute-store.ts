import type { VoiceMutes } from '../types/voice-connection';

const unmuted: VoiceMutes = { microphone: false, speaker: false };

const same = (left: VoiceMutes, right: VoiceMutes): boolean =>
  left.microphone === right.microphone && left.speaker === right.speaker;

/*
 * What a call's mic and speaker mutes are, held in one place: the connection. A store the pages read, never write to
 * on mount, so opening another Session cannot change a mute. Each change makes a new object, so a store hook can tell
 * a change from a re-read.
 */
export class VoiceMuteStore {
  private current = unmuted;
  private readonly listeners = new Set<() => void>();

  public read = (): VoiceMutes => this.current;

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return (): void => {
      this.listeners.delete(listener);
    };
  };

  public change(change: Partial<VoiceMutes>): void {
    const next = { ...this.current, ...change };

    if (same(next, this.current)) return;
    this.current = next;

    for (const listener of this.listeners) listener();
  }

  // A new call, or the end of one, is unmuted.
  public reset(): void {
    this.change(unmuted);
  }
}
