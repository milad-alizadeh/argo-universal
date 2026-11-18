/*
 * The App's side of a Voice call: the microphone, the speaker and the peer connection to the Voice provider (ADR-0063).
 * The Server only relays the offer and the answer, so this is all the audio the App needs.
 */
export interface VoiceConnection {
  // Opens the connection and returns the offer the Voice provider answers.
  createOffer: () => Promise<string>;
  // Completes the connection with the provider's answer.
  accept: (answer: string) => Promise<void>;
  // Stops the microphone sending sound without ending the call.
  setMicrophoneMuted: (muted: boolean) => void;
  // Sets the voice's output volume to zero, or back, without ending the call.
  setSpeakerMuted: (muted: boolean) => void;
  // How loud the microphone and the voice are right now, from 0 to 1. Levels stay in the App and never reach the Server.
  levels: () => VoiceLevels;
  // Hangs up and releases the microphone.
  close: () => void;
}

export interface VoiceLevels {
  input: number;
  output: number;
}
