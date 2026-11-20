// The system's speaker, as `setSinkId` names it.
const systemSpeaker = '';

/*
 * Sound playing on an audio element: its volume, and the speaker it goes to. A speaker that is gone plays on the
 * system's instead, so the sound is never lost.
 */
export abstract class AudioElementPlayback {
  public constructor(protected readonly audio: HTMLAudioElement) {}

  public setVolume(volume: number): void {
    this.audio.volume = volume;
  }

  // null is the system's speaker.
  public setSpeaker(speaker: string | null): void {
    this.audio
      .setSinkId(speaker ?? systemSpeaker)
      .catch(() => this.audio.setSinkId(systemSpeaker))
      .catch((cause: unknown) =>
        console.error('Could not play the voice on that speaker', cause),
      );
  }
}
