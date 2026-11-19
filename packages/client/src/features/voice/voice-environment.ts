// The microphone as the connection uses it: something to let go of. The browser's own carries the sound.
export interface Microphone {
  stop: () => void;
  setMuted: (muted: boolean) => void;
  // Raises or lowers the sound before it is sent; 1 sends it exactly as the microphone gives it.
  setGain: (gain: number) => void;
  // How loud it is now, from 0 to 1.
  level: () => number;
}

// The voice as it plays: something to silence, to move to another speaker, and to let go of.
export interface VoicePlayback {
  stop: () => void;
  // 0 is silent and 1 is full.
  setVolume: (volume: number) => void;
  // null is the system's speaker.
  setSpeaker: (speaker: string | null) => void;
  level: () => number;
}

// A peer connection reduced to what a call needs.
export interface VoicePeer {
  // Sends the microphone up and opens the channel the provider expects; returns the complete offer.
  offer: (microphone: Microphone) => Promise<string>;
  // Sends another microphone's sound up in place of the one sending now, without a new offer.
  replaceMicrophone: (microphone: Microphone) => Promise<void>;
  accept: (answer: string) => Promise<void>;
  // Calls the listener with the voice's sound when it arrives.
  onVoice: (listener: (stream: MediaStream) => void) => void;
  close: () => void;
}

// What the connection needs from the browser, so a test can stand in for it.
export interface VoiceEnvironment {
  // Opens this microphone, or the system's for null; fails when it is refused or gone.
  openMicrophone: (device: string | null) => Promise<Microphone>;
  // Silence to send in place of the microphone, for a connection that only listens.
  openSilence: () => Microphone;
  createPeer: () => VoicePeer;
  playVoice: (stream: MediaStream, speaker: string | null) => VoicePlayback;
}

// The microphone was refused or is missing; the call cannot start.
export class MicrophoneUnavailable extends Error {
  public constructor() {
    super('Microphone access is needed to talk.');
  }
}
