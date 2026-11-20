import type {
  DeviceSound,
  ListeningMicrophone,
  PlayingChime,
} from '../types/device-sound';

// How often the meters read their levels while something sounds: 20 times a second.
const sampleMs = 50;

// The microphone the page wants measured, and whether it may be opened.
interface WantedMicrophone {
  microphone: string | null;
  allowed: boolean;
}

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
  // The microphone the page wants measured, and whether it may be opened.
  private wanted: WantedMicrophone = { microphone: null, allowed: false };
  // The microphone open now, or being opened; undefined while none is.
  private openedFor: string | null | undefined;
  // How many glyphs show the microphone: it opens only while one is drawn.
  private watchers = 0;

  public readonly microphone: DeviceMeter = {
    level: () => this.listening?.level() ?? 0,
    subscribe: (onChange) => this.watch(onChange),
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

  // A glyph showing the microphone: the first opens it, and the last to go lets go of it.
  private watch(onChange: () => void): () => void {
    const leave = this.subscribe(onChange);

    this.watchers += 1;
    this.follow();

    return () => {
      leave();
      this.watchers -= 1;
      this.follow();
    };
  }

  // Which microphone to measure, and whether it may be opened at all.
  public want(microphone: string | null, allowed: boolean): void {
    this.wanted = { microphone, allowed };
    this.follow();
  }

  private follow(): void {
    if (this.mayOpen()) void this.open(this.wanted.microphone);
    else this.letGo();
  }

  private mayOpen(): boolean {
    return this.wanted.allowed && this.watchers > 0;
  }

  private letGo(): void {
    if (this.openedFor !== undefined) this.stopListening();
  }

  private async open(microphone: string | null): Promise<void> {
    if (this.openedFor === microphone) return;

    const opening = this.listen(microphone);
    this.openedFor = microphone;
    await opening;
  }

  public testing(): boolean {
    return this.playing !== null;
  }

  public async listen(microphone: string | null): Promise<void> {
    this.stopListening();

    const opening = this.openings;
    const opened = await this.openMicrophone(microphone);

    if (opening === this.openings) this.heard(opened);
    else opened?.stop();
  }

  // The microphone, or null when it is refused or gone, so its glyph stays unlit.
  private openMicrophone(
    microphone: string | null,
  ): Promise<ListeningMicrophone | null> {
    return this.sound.listen(microphone, this.gain).catch(() => null);
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
    this.openedFor = undefined;
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
