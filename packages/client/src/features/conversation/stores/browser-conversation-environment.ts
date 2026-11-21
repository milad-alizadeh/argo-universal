import type {
  Microphone,
  ConversationEnvironment,
  VoicePeer,
  VoicePlayback,
} from '../types/conversation-environment';
import { peerStatsOf, type PeerStats } from '../utils/peer-stats';
import { BrowserClipPlayback, BrowserRecording } from './browser-clips';
import { BrowserMicrophone } from './browser-microphone';
import { BrowserSilence } from './browser-silence';
import { LevelMeter } from './level-meter';
import {
  firstVoiceStream,
  microphoneReplacer,
  offerWithCandidates,
} from './peer-media';
import { AudioElementPlayback } from './speaker-sink';

function streamOf(microphone: Microphone): MediaStream {
  if (microphone instanceof BrowserSilence) return microphone.stream;

  if (!(microphone instanceof BrowserMicrophone))
    throw new Error('Not a browser microphone.');

  return microphone.stream;
}

class BrowserPeer implements VoicePeer {
  private readonly connection = new RTCPeerConnection();

  public async offer(microphone: Microphone): Promise<string> {
    this.sendUp(streamOf(microphone));

    return offerWithCandidates(this.connection);
  }

  private sendUp(stream: MediaStream): void {
    for (const track of stream.getTracks())
      this.connection.addTrack(track, stream);
  }

  // The sender keeps its place in the offer, so the provider hears the new microphone with no renegotiation.
  public replaceMicrophone = microphoneReplacer(this.connection, streamOf);

  public async accept(answer: string): Promise<void> {
    await this.connection.setRemoteDescription({ type: 'answer', sdp: answer });
  }

  public onVoice(listener: (stream: MediaStream) => void): void {
    this.connection.addEventListener('track', firstVoiceStream(listener));
  }

  // SPIKE (latency on a phone): the desktop baseline reads the same stats the phone does.
  public async stats(): Promise<PeerStats> {
    return peerStatsOf(await this.connection.getStats());
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

class BrowserPlayback extends AudioElementPlayback implements VoicePlayback {
  private readonly meter: LevelMeter;

  public constructor(stream: MediaStream, speaker: string | null) {
    super(new Audio());
    this.audio.srcObject = stream;
    this.meter = new LevelMeter(stream);
    this.setSpeaker(speaker);
    void this.audio.play();
  }

  // The meter reads the stream before the volume, so a silenced voice still moves the band.
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
export const browserConversationEnvironment: ConversationEnvironment = {
  openMicrophone,
  openSilence: () => new BrowserSilence(),
  createPeer: () => new BrowserPeer(),
  playVoice,
  recordVoice: (stream) =>
    typeof MediaRecorder === 'undefined' ? null : new BrowserRecording(stream),
  playClip: (clip, speaker) => new BrowserClipPlayback(clip, speaker),
};

// Whether this page can carry a call: it has a microphone to ask for and a peer connection to make.
export const browserCarriesAudio = (): boolean =>
  typeof RTCPeerConnection !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  navigator.mediaDevices !== undefined;
