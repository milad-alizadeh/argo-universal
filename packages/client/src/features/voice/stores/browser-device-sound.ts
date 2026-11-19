import type {
  DeviceSound,
  ListeningMicrophone,
  PlayingChime,
} from '../types/device-sound';
import { levelOf } from '../utils/audio-bands';
import { AudioElementPlayback } from './speaker-sink';

const fftSize = 256;

// An analyser at the end of a chain, and the level it reads now.
class Analysed {
  public readonly node: AnalyserNode;
  private readonly bins: Uint8Array<ArrayBuffer>;

  public constructor(context: AudioContext) {
    this.node = context.createAnalyser();
    this.node.fftSize = fftSize;
    this.bins = new Uint8Array(this.node.frequencyBinCount);
  }

  public level(): number {
    this.node.getByteFrequencyData(this.bins);

    return levelOf(this.bins);
  }
}

/*
 * The microphone through a gain node at the saved gain into an analyser: the level a call would send. Nothing leaves
 * the page, and stopping it ends the track, so the browser's recording mark goes.
 */
class MeteredMicrophone implements ListeningMicrophone {
  private readonly context = new AudioContext();
  private readonly gain = this.context.createGain();
  private readonly analysed = new Analysed(this.context);

  public constructor(
    private readonly stream: MediaStream,
    gain: number,
  ) {
    this.context.createMediaStreamSource(stream).connect(this.gain);
    this.gain.connect(this.analysed.node);
    this.setGain(gain);
    void this.context.resume();
  }

  public level(): number {
    return this.analysed.level();
  }

  public setGain(gain: number): void {
    this.gain.gain.value = gain;
  }

  public stop(): void {
    for (const track of this.stream.getTracks()) track.stop();
    void this.context.close();
  }
}

const audioOf = (device: string | null): MediaTrackConstraints | true =>
  device === null ? true : { deviceId: { exact: device } };

// The test sound: two short rising notes, A5 then E6 in hertz, as a system's alert chime.
const lowNote = 880;

const highNote = 1320;

const notes = [lowNote, highNote];

const msPerSecond = 1000;

// An exponential fade cannot reach zero, so a note fades to this, which no one hears.
const silent = 0.001;

const noteSeconds = 0.22;

const fadeSeconds = 0.04;

// How long the chime lasts, notes and their fade, in milliseconds.
const chimeMs = (notes.length * noteSeconds + fadeSeconds) * msPerSecond;

// A sine note that rises quickly and fades out, after the notes before it.
function playNote(context: AudioContext, into: AudioNode, note: number): void {
  const start = context.currentTime + notes.indexOf(note) * noteSeconds;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();

  oscillator.frequency.value = note;
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(1, start + fadeSeconds);
  envelope.gain.exponentialRampToValueAtTime(
    silent,
    start + noteSeconds + fadeSeconds,
  );
  oscillator.connect(envelope).connect(into);
  oscillator.start(start);
  oscillator.stop(start + noteSeconds + fadeSeconds);
}

/*
 * The speaker's test sound, made on the page and played through an audio element so it goes to the chosen speaker
 * (`setSinkId`), at the saved volume. Its analyser shows its level as it plays.
 */
class Chime extends AudioElementPlayback implements PlayingChime {
  private readonly context = new AudioContext();
  private readonly analysed = new Analysed(this.context);
  private timer: ReturnType<typeof setTimeout> | undefined;
  public readonly ended: Promise<void>;

  public constructor(speaker: string | null, volume: number) {
    super(new Audio());

    const output = this.context.createMediaStreamDestination();
    this.analysed.node.connect(output);
    this.audio.srcObject = output.stream;
    this.setVolume(volume);
    this.setSpeaker(speaker);
    this.ended = new Promise((resolve) => {
      this.timer = setTimeout(resolve, chimeMs);
    });
    this.play();
  }

  private play(): void {
    void this.context.resume();

    for (const note of notes) playNote(this.context, this.analysed.node, note);

    this.audio.play().catch(() => {});
  }

  public level(): number {
    return this.analysed.level();
  }

  public stop(): void {
    clearTimeout(this.timer);
    this.audio.pause();
    this.audio.srcObject = null;
    void this.context.close();
  }
}

// The browser's own microphone and speakers, for Settings › Voice's meters.
export const browserDeviceSound: DeviceSound = {
  listen: async (microphone, gain) =>
    new MeteredMicrophone(
      await navigator.mediaDevices.getUserMedia({ audio: audioOf(microphone) }),
      gain,
    ),
  chime: (speaker, volume) => new Chime(speaker, volume),
};
