import type { VoicePreviewClip, ConversationStatus } from '@repo/contracts';
import type { ConversationDeviceChoice } from '../stores/conversation-device-choice';

/*
 * The App's side of a Conversation: the microphone, the speaker and the peer connection to the Conversation provider (ADR-0064).
 * The Server only relays the offer and the answer, so this is all the audio the App needs.
 */
export interface ConversationConnection {
  // Opens the connection and returns the offer the Conversation provider answers.
  createOffer: () => Promise<string>;
  // Completes the connection with the provider's answer.
  accept: (answer: string) => Promise<void>;
  // Stops the microphone sending sound without ending the call. A connection with no call running ignores it.
  setMicrophoneMuted: (muted: boolean) => void;
  // Sets the voice's output volume to zero, or back, without ending the call. A connection with no call running ignores it.
  setSpeakerMuted: (muted: boolean) => void;
  // What is muted now. The connection is the only owner of this: every call starts unmuted, and so does the time after one.
  mutes: () => ConversationMutes;
  // Calls the listener when a mute changes; the returned function stops listening.
  subscribe: (listener: () => void) => () => void;
  // Uses this microphone and speaker from the next call on, and moves a running call to them; null follows the system.
  chooseDevices: (choice: ConversationDeviceChoice) => Promise<void>;
  // Plays the voice at this volume and sends the microphone at this gain, from the next call on and in a running one at once.
  setSound: (sound: VoiceSound) => void;
  // How loud the microphone and the voice are right now, from 0 to 1. Levels stay in the App and never reach the Server.
  levels: () => VoiceLevels;
  // How loud each band of speech is right now, for the microphone and the voice; the same buffers each read, refilled.
  spectrum: () => VoiceSpectrum;
  // Hangs up and releases the microphone. A preview plays on.
  close: () => void;
  /*
   * Opens a connection that only listens, sending silence and never the microphone, and completes it with the answer
   * `answerFor` gets for its offer. It replaces an earlier preview, a call's offer ends it, and it lets go of itself after a while.
   */
  preview: (
    answerFor: (offer: string) => Promise<string>,
    // Called with the greeting once the voice has said it whole, for the Server to keep; never for a preview let go of early.
    onRecorded?: (clip: VoicePreviewClip) => void,
  ) => Promise<void>;
  // Plays a stored greeting with no peer connection, in place of any preview, until it ends or the preview is let go of.
  playClip: (clip: VoicePreviewClip) => void;
  // Lets go of the preview's connection.
  endPreview: () => void;
}

// The volume and microphone gain the person chose, in percent, as the Server keeps them.
export type VoiceSound = Pick<ConversationStatus, 'volume' | 'microphoneGain'>;

export interface ConversationMutes {
  microphone: boolean;
  speaker: boolean;
}

export interface VoiceLevels {
  input: number;
  output: number;
}

// How many bands of speech a spectrum holds, low to high.
export const spectrumBands = 16;

// Each band from 0 to 1, low to high. Read each frame by the band; never stored, never sent.
export interface VoiceSpectrum {
  input: Float32Array;
  output: Float32Array;
}

export const silentSpectrum = (): VoiceSpectrum => ({
  input: new Float32Array(spectrumBands),
  output: new Float32Array(spectrumBands),
});
