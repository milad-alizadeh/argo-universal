import { setAudioModeAsync } from 'expo-audio';
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
import {
  firstVoiceStream,
  microphoneReplacer,
  offerWithCandidates,
} from './peer-media';
import { requestPhoneSpeakerRoute } from './phone-speaker-route';

/*
 * SPIKE (latency on a phone, docs/research/voice-mode.md): the least a phone needs to carry a real Conversation, so its
 * latency can be measured against the desktop App's. Left out on purpose: choosing a device,
 * microphone gain, voice previews, a real spectrum and recovery from a network change.
 */

function configureConversationAudio(): void {
  void setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: true,
    shouldRouteThroughEarpiece: false,
    interruptionMode: 'doNotMix',
    shouldPlayInBackground: true,
    allowsBackgroundRecording: true,
  }).catch((cause: unknown) => {
    const message = cause instanceof Error ? cause.message : String(cause);

    console.error('Could not configure iPhone Conversation audio', message);
  });
}

// The levels the peer's stats gave last. A phone has no AnalyserNode, so the band is moved by these.
const levels = { input: 0, output: 0 };

// A stats level is linear and speech sits low in it; the band expects speech to reach most of its height.
const bandLevelGain = 1.5;

const bandLevelOf = (level: number): number =>
  Math.min(1, Math.sqrt(level) * bandLevelGain);

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

class PhonePeer implements VoicePeer<PhoneStream> {
  private readonly connection = new RTCPeerConnection();

  public async offer(microphone: Microphone): Promise<string> {
    const stream = streamOf(microphone);

    for (const track of stream.getTracks())
      this.connection.addTrack(track, stream);

    return offerWithCandidates(this.connection);
  }

  public replaceMicrophone = microphoneReplacer(this.connection, streamOf);

  public async accept(answer: string): Promise<void> {
    await this.connection.setRemoteDescription(
      new RTCSessionDescription({ type: 'answer', sdp: answer }),
    );
  }

  public onVoice(listener: (stream: PhoneStream) => void): void {
    this.connection.addEventListener('track', firstVoiceStream(listener));
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

/*
 * The voice on a phone plays by itself once its track arrives. Set the route once:
 * reapplying the audio session category during playback stalls jitter-buffer output.
 */
class PhonePlayback implements VoicePlayback {
  private readonly cancelSpeakerRoute =
    Platform.OS === 'ios'
      ? requestPhoneSpeakerRoute(configureConversationAudio)
      : undefined;

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
    this.cancelSpeakerRoute?.();
  }
}

// Voice previews are left out of the spike, so a stored greeting plays nothing.
const noPlayback: VoicePlayback = {
  stop: () => {},
  setVolume: () => {},
  setSpeaker: () => {},
  level: () => 0,
  spectrum: (into) => void into.fill(0),
};

const environment: ConversationEnvironment<PhoneStream> = {
  openMicrophone: async () =>
    new PhoneMicrophone(await mediaDevices.getUserMedia({ audio: true })),
  openSilence: () => {
    throw new Error('A phone plays no voice preview yet.');
  },
  createPeer: () => new PhonePeer(),
  playVoice: (stream) => new PhonePlayback(stream),
  recordVoice: () => null,
  playClip: () => noPlayback,
};

export const phoneConversationEnvironment: ConversationEnvironment<PhoneStream> | null =
  Platform.OS === 'ios' || (__DEV__ && Platform.OS === 'android')
    ? environment
    : null;
