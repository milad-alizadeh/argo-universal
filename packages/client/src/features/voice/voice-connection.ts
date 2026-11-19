import type { VoiceStatus } from '@repo/contracts';
import type { VoiceDeviceChoice } from './voice-device-choice';

/*
 * The App's side of a Voice call: the microphone, the speaker and the peer connection to the Voice provider (ADR-0063).
 * The Server only relays the offer and the answer, so this is all the audio the App needs.
 */
export interface VoiceConnection {
  // Opens the connection and returns the offer the Voice provider answers.
  createOffer: () => Promise<string>;
  // Completes the connection with the provider's answer.
  accept: (answer: string) => Promise<void>;
  // Stops the microphone sending sound without ending the call. A connection with no call running ignores it.
  setMicrophoneMuted: (muted: boolean) => void;
  // Sets the voice's output volume to zero, or back, without ending the call. A connection with no call running ignores it.
  setSpeakerMuted: (muted: boolean) => void;
  // What is muted now. The connection is the only owner of this: every call starts unmuted, and so does the time after one.
  mutes: () => VoiceMutes;
  // Calls the listener when a mute changes; the returned function stops listening.
  subscribe: (listener: () => void) => () => void;
  // Uses this microphone and speaker from the next call on, and moves a running call to them; null follows the system.
  chooseDevices: (choice: VoiceDeviceChoice) => Promise<void>;
  // Plays the voice at this volume and sends the microphone at this gain, from the next call on and in a running one at once.
  setSound: (sound: VoiceSound) => void;
  // How loud the microphone and the voice are right now, from 0 to 1. Levels stay in the App and never reach the Server.
  levels: () => VoiceLevels;
  // Hangs up and releases the microphone. A preview plays on.
  close: () => void;
  /*
   * Opens a connection that only listens, sending silence and never the microphone, and completes it with the answer
   * `answerFor` gets for its offer. It replaces an earlier preview, a call's offer ends it, and it lets go of itself after a while.
   */
  preview: (answerFor: (offer: string) => Promise<string>) => Promise<void>;
  // Lets go of the preview's connection.
  endPreview: () => void;
}

// The volume and microphone gain the person chose, in percent, as the Server keeps them.
export type VoiceSound = Pick<VoiceStatus, 'volume' | 'microphoneGain'>;

export interface VoiceMutes {
  microphone: boolean;
  speaker: boolean;
}

export interface VoiceLevels {
  input: number;
  output: number;
}
