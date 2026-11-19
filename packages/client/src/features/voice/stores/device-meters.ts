import type {
  DeviceSound,
  ListeningMicrophone,
  PlayingChime,
} from '../types/device-sound';

// How often the meters read their levels while something sounds: 20 times a second.
const sampleMs = 50;

// A level a glyph reads, and says has moved.
export interface DeviceMeter {
  level: () => number;
  subscribe: (onChange: () => void) => () => void;
}

/*
 * Settings › Voice's microphone and speaker meters (Paper "Option D"): the chosen microphone's level while the page is
 * open, and the speaker's short test sound with its level while it plays. It reads the levels about 20 times a second
 * only while one of them sounds, and lets go of both when closed. A microphone that is refused or gone reads nothing.
 */
export class DeviceMeters {
  private readonly listeners = new Set<() => void>();
  private listening: ListeningMicrophone | null = null;
  private playing: PlayingChime | null = null;
  // Counts the openings, so a microphone that opens after the page stopped listening is let go at once.
  private openings = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  // The saved gain, which a microphone opens at and follows; 1 is the microphone as it is.
  private gain = 1;

  public readonly microphone: DeviceMeter = {
    level: () => this.listening?.level() ?? 0,
    subscribe: (onChange) => this.subscribe(onChange),
  };

  public readonly speaker: DeviceMeter = {
    level: () => this.playing?.level() ?? 0,
    subscribe: (onChange) => this.subscribe(onChange),
  };

  public constructor(private readonly sound: DeviceSound) {}

  public subscribe(onChange: () => void): () => void {
    this.listeners.add(onChange);

    return () => this.listeners.delete(onChange);
  }

  public testing(): boolean {
    return this.playing !== null;
  }

  public async listen(microphone: string | null): Promise<void> {
    this.stopListening();

    const opening = this.openings;
    const opened = await this.sound
      .listen(microphone, this.gain)
      .catch(() => null);

    if (opening === this.openings) this.heard(opened);
    else opened?.stop();
  }

  private heard(opened: ListeningMicrophone | null): void {
    this.listening = opened;
    this.sounding();
  }

  public setGain(gain: number): void {
    this.gain = gain;
    this.listening?.setGain(gain);
  }

  public stopListening(): void {
    this.openings += 1;
    this.listening?.stop();
    this.listening = null;
    this.sounding();
  }

  // Plays the test sound, or stops the one playing.
  public toggleTest(speaker: string | null, volume: number): void {
    if (this.playing) return this.stopTest();

    const chime = this.sound.chime(speaker, volume);
    this.playing = chime;
    void chime.ended.then(() => this.ended(chime));
    this.sounding();
  }

  private ended(chime: PlayingChime): void {
    if (this.playing === chime) this.stopTest();
  }

  private stopTest(): void {
    this.playing?.stop();
    this.playing = null;
    this.sounding();
  }

  public close(): void {
    this.stopListening();
    this.stopTest();
  }

  // Samples while a microphone listens or the test sound plays, and tells the glyphs once more when both stop.
  private sounding(): void {
    if (this.sounds())
      this.timer ??= setInterval(() => this.notify(), sampleMs);
    else this.quiet();

    this.notify();
  }

  private sounds(): boolean {
    return this.listening !== null || this.playing !== null;
  }

  private quiet(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
