import { LevelMeter } from './level-meter';
import type {
  Microphone,
  VoiceEnvironment,
  VoicePeer,
  VoicePlayback,
} from './voice-environment';

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

  public spectrum(into: Float32Array): void {
    if (this.muted) into.fill(0);
    else this.meter.spectrum(into);
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

  // The sender keeps its place in the offer, so the provider hears the new microphone with no renegotiation.
  public async replaceMicrophone(microphone: Microphone): Promise<void> {
    const [track] = streamOf(microphone).getAudioTracks();

    const sender = this.connection
      .getSenders()
      .find((each) => each.track?.kind === 'audio');

    await sender?.replaceTrack(track ?? null);
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

// Exactly the chosen microphone, so a missing one fails here and the connection can fall back to the system's.
const audioOf = (device: string | null): MediaTrackConstraints | true =>
  device === null ? true : { deviceId: { exact: device } };

async function openMicrophone(device: string | null): Promise<Microphone> {
  return new BrowserMicrophone(
    await navigator.mediaDevices.getUserMedia({ audio: audioOf(device) }),
  );
}

// The system's speaker, as `setSinkId` names it.
const systemSpeaker = '';

class BrowserPlayback implements VoicePlayback {
  private readonly audio = new Audio();
  private readonly meter: LevelMeter;

  public constructor(stream: MediaStream, speaker: string | null) {
    this.audio.srcObject = stream;
    this.meter = new LevelMeter(stream);
    this.setSpeaker(speaker);
    void this.audio.play();
  }

  public setVolume(volume: number): void {
    this.audio.volume = volume;
  }

  // A speaker that is gone plays on the system's instead, so the voice is never lost.
  public setSpeaker(speaker: string | null): void {
    this.audio
      .setSinkId(speaker ?? systemSpeaker)
      .catch(() => this.audio.setSinkId(systemSpeaker))
      .catch((cause: unknown) =>
        console.error('Could not play the voice on that speaker', cause),
      );
  }

  // The meter reads the stream before the volume, so a silenced voice still moves the orb.
  public level(): number {
    return this.meter.level();
  }

  public spectrum(into: Float32Array): void {
    this.meter.spectrum(into);
  }

  public stop(): void {
    this.meter.close();
    this.audio.pause();
    this.audio.srcObject = null;
  }
}

const playVoice = (
  stream: MediaStream,
  speaker: string | null,
): VoicePlayback => new BrowserPlayback(stream, speaker);

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
