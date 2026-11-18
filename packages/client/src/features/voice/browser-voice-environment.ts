import type {
  Microphone,
  VoiceEnvironment,
  VoicePeer,
  VoicePlayback,
} from './webrtc-voice-connection';

const iceGatheringLimitMs = 3000;

// The offer is sent whole, so wait for the candidates it carries, or stop waiting after a moment.
function gathered(connection: RTCPeerConnection): Promise<void> {
  return new Promise((resolve) => {
    const check = (): void => {
      if (connection.iceGatheringState === 'complete') resolve();
    };

    connection.addEventListener('icegatheringstatechange', check);
    setTimeout(resolve, iceGatheringLimitMs);
    check();
  });
}

const fftSize = 256;

const loudest = 255;

// Reads how loud a stream is, from 0 to 1, as the loudest frequency's strength. The levels stay in the App: they only move the orb.
class LevelMeter {
  private readonly context = new AudioContext();
  private readonly analyser = this.context.createAnalyser();
  private readonly bins: Uint8Array<ArrayBuffer>;

  public constructor(stream: MediaStream) {
    this.analyser.fftSize = fftSize;
    this.bins = new Uint8Array(this.analyser.frequencyBinCount);
    this.context.createMediaStreamSource(stream).connect(this.analyser);
  }

  public level(): number {
    this.analyser.getByteFrequencyData(this.bins);

    return Math.max(...this.bins) / loudest;
  }

  public close(): void {
    void this.context.close();
  }
}

class BrowserMicrophone implements Microphone {
  private readonly meter: LevelMeter;
  private muted = false;

  public constructor(public readonly stream: MediaStream) {
    this.meter = new LevelMeter(stream);
  }

  public stop(): void {
    this.meter.close();

    for (const track of this.stream.getTracks()) track.stop();
  }

  // A muted track sends silence, so the call stays up.
  public setMuted(muted: boolean): void {
    this.muted = muted;

    for (const track of this.stream.getAudioTracks()) track.enabled = !muted;
  }

  public level(): number {
    return this.muted ? 0 : this.meter.level();
  }
}

function streamOf(microphone: Microphone): MediaStream {
  if (!(microphone instanceof BrowserMicrophone))
    throw new Error('Not a browser microphone.');

  return microphone.stream;
}

const sdpOf = (connection: RTCPeerConnection): string =>
  connection.localDescription?.sdp ?? '';

class BrowserPeer implements VoicePeer {
  private readonly connection = new RTCPeerConnection();

  public async offer(microphone: Microphone): Promise<string> {
    this.sendUp(streamOf(microphone));
    // The provider carries its events on this channel.
    this.connection.createDataChannel('oai-events');
    await this.connection.setLocalDescription(
      await this.connection.createOffer(),
    );
    await gathered(this.connection);

    return sdpOf(this.connection);
  }

  private sendUp(stream: MediaStream): void {
    for (const track of stream.getTracks())
      this.connection.addTrack(track, stream);
  }

  public async accept(answer: string): Promise<void> {
    await this.connection.setRemoteDescription({ type: 'answer', sdp: answer });
  }

  public onVoice(listener: (stream: MediaStream) => void): void {
    this.connection.addEventListener('track', ({ streams }) => {
      const [voice] = streams;

      if (voice) listener(voice);
    });
  }

  public close(): void {
    this.connection.close();
  }
}

async function openMicrophone(): Promise<Microphone> {
  return new BrowserMicrophone(
    await navigator.mediaDevices.getUserMedia({ audio: true }),
  );
}

class BrowserPlayback implements VoicePlayback {
  private readonly audio = new Audio();
  private readonly meter: LevelMeter;

  public constructor(stream: MediaStream) {
    this.audio.srcObject = stream;
    this.meter = new LevelMeter(stream);
    void this.audio.play();
  }

  public setVolume(volume: number): void {
    this.audio.volume = volume;
  }

  // The meter reads the stream before the volume, so a silenced voice still moves the orb.
  public level(): number {
    return this.audio.volume === 0 ? 0 : this.meter.level();
  }

  public stop(): void {
    this.meter.close();
    this.audio.pause();
    this.audio.srcObject = null;
  }
}

const playVoice = (stream: MediaStream): VoicePlayback =>
  new BrowserPlayback(stream);

// The page's own pieces: the system microphone, a peer connection, and an audio element for the voice.
export const browserVoiceEnvironment: VoiceEnvironment = {
  openMicrophone,
  createPeer: () => new BrowserPeer(),
  playVoice,
};

// Whether this page can carry a call: it has a microphone to ask for and a peer connection to make.
export const browserCarriesAudio = (): boolean =>
  typeof RTCPeerConnection !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  navigator.mediaDevices !== undefined;
