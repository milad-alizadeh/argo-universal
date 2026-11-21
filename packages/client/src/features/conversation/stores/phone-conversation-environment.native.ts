import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import {
  mediaDevices,
  RTCPeerConnection,
  RTCSessionDescription,
  type MediaStream as PhoneStream,
} from 'react-native-webrtc';
import type {
  ConversationEnvironment,
  Microphone,
  VoicePeer,
  VoicePlayback,
} from '../types/conversation-environment';
import { peerStatsOf, type PeerStats } from '../utils/peer-stats';

/*
 * SPIKE (latency on a phone, docs/research/voice-mode.md): the least a phone needs to carry a real Conversation, so its
 * latency can be measured against the desktop App's. iPhone only. Left out on purpose: background audio, choosing a
 * device, microphone gain, voice previews, a real spectrum and recovery from a network change.
 */

interface AudioRouteModule {
  // Moves the call from the earpiece to the loudspeaker, leaving headphones and Bluetooth alone; returns the output's name.
  preferLoudspeaker: () => string;
  route: () => string;
}

const audioRoute =
  requireOptionalNativeModule<AudioRouteModule>('ArgoAudioRoute');

export const phoneAudioRoute = (): string | undefined => audioRoute?.route();

// The levels the peer's stats gave last. A phone has no AnalyserNode, so the band is moved by these.
const levels = { input: 0, output: 0 };

// A stats level is linear and speech sits low in it; the band expects speech to reach most of its height.
const bandLevelOf = (level: number): number =>
  Math.min(1, Math.sqrt(level) * 1.5);

class PhoneMicrophone implements Microphone {
  private muted = false;

  public constructor(public readonly stream: PhoneStream) {}

  public stop(): void {
    for (const track of this.stream.getTracks()) track.stop();
    this.stream.release();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;

    for (const track of this.stream.getAudioTracks()) track.enabled = !muted;
  }

  // Left out of the spike: the microphone is sent as the phone gives it.
  public setGain(): void {}

  public level(): number {
    return this.muted ? 0 : bandLevelOf(levels.input);
  }

  public spectrum(into: Float32Array): void {
    into.fill(this.level());
  }
}

const streamOf = (microphone: Microphone): PhoneStream => {
  if (!(microphone instanceof PhoneMicrophone))
    throw new Error('Not a phone microphone.');

  return microphone.stream;
};

const iceGatheringLimitMs = 3000;

// The offer is sent whole, as on a page: wait for its candidates, or stop waiting after a moment.
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

class PhonePeer implements VoicePeer {
  private readonly connection = new RTCPeerConnection();

  public async offer(microphone: Microphone): Promise<string> {
    const stream = streamOf(microphone);

    for (const track of stream.getTracks())
      this.connection.addTrack(track, stream);

    // The provider carries its events on this channel.
    this.connection.createDataChannel('oai-events');

    await this.connection.setLocalDescription(
      await this.connection.createOffer(),
    );
    await gathered(this.connection);

    return this.connection.localDescription?.sdp ?? '';
  }

  public async replaceMicrophone(microphone: Microphone): Promise<void> {
    const [track] = streamOf(microphone).getAudioTracks();

    const sender = this.connection
      .getSenders()
      .find((each) => each.track?.kind === 'audio');

    await sender?.replaceTrack(track ?? null);
  }

  public async accept(answer: string): Promise<void> {
    await this.connection.setRemoteDescription(
      new RTCSessionDescription({ type: 'answer', sdp: answer }),
    );
  }

  // The interface names the page's stream; a phone's is its own class and is only ever handed back to this file.
  public onVoice(listener: (stream: MediaStream) => void): void {
    this.connection.addEventListener('track', ({ streams }) => {
      const [voice] = streams;

      if (voice) listener(voice as unknown as MediaStream);
    });
  }

  public async stats(): Promise<PeerStats> {
    const stats = peerStatsOf(await this.connection.getStats());
    levels.input = stats.input;
    levels.output = stats.output;

    return stats;
  }

  public close(): void {
    this.connection.close();
    levels.input = 0;
    levels.output = 0;
  }
}

// The phone sets its audio session up as the call's sound starts, so the loudspeaker is asked for then and twice after.
const loudspeakerRetriesMs = [0, 500, 1500];

/*
 * The voice on a phone plays by itself once its track arrives; this only sets its volume and puts it on the
 * loudspeaker, since a call starts on the earpiece.
 */
class PhonePlayback implements VoicePlayback {
  private readonly timers = loudspeakerRetriesMs.map((delay) =>
    setTimeout(() => audioRoute?.preferLoudspeaker(), delay),
  );

  public constructor(private readonly stream: PhoneStream) {}

  public setVolume(volume: number): void {
    for (const track of this.stream.getAudioTracks()) track._setVolume(volume);
  }

  // Left out of the spike: the phone's own route decides.
  public setSpeaker(): void {}

  public level(): number {
    return bandLevelOf(levels.output);
  }

  public spectrum(into: Float32Array): void {
    into.fill(this.level());
  }

  public stop(): void {
    for (const timer of this.timers) clearTimeout(timer);
  }
}

// Voice previews are left out of the spike, so a stored greeting plays nothing.
const noPlayback: VoicePlayback = {
  stop: () => undefined,
  setVolume: () => undefined,
  setSpeaker: () => undefined,
  level: () => 0,
  spectrum: (into) => void into.fill(0),
};

const environment: ConversationEnvironment = {
  openMicrophone: async () =>
    new PhoneMicrophone(await mediaDevices.getUserMedia({ audio: true })),
  openSilence: () => {
    throw new Error('A phone plays no voice preview yet.');
  },
  createPeer: () => new PhonePeer(),
  playVoice: (stream) => new PhonePlayback(stream as unknown as PhoneStream),
  recordVoice: () => null,
  playClip: () => noPlayback,
};

export const phoneConversationEnvironment: ConversationEnvironment | null =
  Platform.OS === 'ios' ? environment : null;
