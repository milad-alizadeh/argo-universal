import type { VoicePreviewClip } from '@repo/contracts';
import type { VoiceRecording } from '../types/conversation-environment';

// How often the voice is listened to, and how long it must stay quiet after speaking for its greeting to be said.
const listenMs = 100;

const quietMs = 800;

// Quieter than this is no speech.
const audible = 0.02;

/*
 * One preview's recording. The greeting is whole once the voice has spoken and then stayed quiet; it is handed over
 * then and only then, so a preview let go of early never leaves a clip cut short.
 */
export class PreviewTake {
  private readonly timer: ReturnType<typeof setInterval>;
  private heard = false;
  private quietSince = 0;
  private over = false;

  public constructor(
    private readonly recording: VoiceRecording,
    private readonly level: () => number,
    private readonly onClip: (clip: VoicePreviewClip) => void,
  ) {
    this.timer = setInterval(() => this.listen(), listenMs);
  }

  // Throws the recording away unless the greeting was already handed over.
  public cancel(): void {
    if (this.over) return;
    this.over = true;
    clearInterval(this.timer);
    this.recording.cancel();
  }

  private listen(): void {
    if (this.level() > audible) {
      this.heard = true;
      this.quietSince = 0;

      return;
    }

    if (this.heard) this.quiet();
  }

  private quiet(): void {
    this.quietSince ||= Date.now();

    if (Date.now() - this.quietSince >= quietMs) this.finish();
  }

  private finish(): void {
    this.over = true;
    clearInterval(this.timer);
    this.recording
      .finish()
      .then((clip) => {
        if (clip) this.onClip(clip);
      })
      .catch(() => {});
  }
}
