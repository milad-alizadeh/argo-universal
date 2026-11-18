/*
 * The App's side of a Voice call: the microphone, the speaker and the peer connection to the Voice provider (ADR-0063).
 * The Server only relays the offer and the answer, so this is all the audio the App needs.
 */
export interface VoiceConnection {
  // Opens the connection and returns the offer the Voice provider answers.
  createOffer: () => Promise<string>;
  // Completes the connection with the provider's answer.
  accept: (answer: string) => Promise<void>;
  // Hangs up and releases the microphone.
  close: () => void;
}
