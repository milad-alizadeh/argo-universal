import type { VoicePreviewClip } from '@repo/contracts';
import type { VoicePlayback, VoiceRecording } from '../types/conversation-environment';
import type { HeldCall, HeldSound } from './held-conversation';
import { PreviewTake } from './preview-take';

// How long a preview may hold its connection; the Server hangs up sooner, once the greeting is said.
const previewLimitMs = 30_000;

/*
 * The one preview a connection holds: a live listening-only call, or a stored greeting playing. A new one, a call's
 * offer or `end` lets the old one go, and a live one lets go of itself after a while.
 */
export class ConnectionPreview {
  private live: HeldCall | undefined;
  private clip: VoicePlayback | undefined;
  private take: PreviewTake | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;

  // Lets the earlier preview go and holds this live call in its place.
  public adopt(held: HeldCall): void {
    this.end();
    this.live = held;
    this.timer = setTimeout(() => this.end(), previewLimitMs);
  }

  public isLive(held: HeldCall): boolean {
    return this.live === held;
  }

  // Plays a stored greeting in place of any preview.
  public play(playback: VoicePlayback): void {
    this.end();
    this.clip = playback;
  }

  // Records the live preview's voice, handing the greeting over once it is whole.
  public record(
    held: HeldCall,
    recording: VoiceRecording | null,
    onClip: (clip: VoicePreviewClip) => void,
  ): void {
    if (recording && this.live === held)
      this.take = new PreviewTake(
        recording,
        () => held.playback?.level() ?? 0,
        onClip,
      );
  }

  public setSound(sound: HeldSound): void {
    void this.live?.setSound(sound);
    this.clip?.setVolume(sound.volume);
  }

  public end(): void {
    clearTimeout(this.timer);
    this.take?.cancel();
    this.take = undefined;
    this.clip?.stop();
    this.clip = undefined;
    this.release();
  }

  private release(): void {
    const { live } = this;
    this.live = undefined;
    live?.release();
  }
}
