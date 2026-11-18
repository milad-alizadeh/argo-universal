/*
 * The App's side of a Voice call: the microphone, the speaker and the peer connection to the Voice provider (ADR-0062).
 * The Server only relays the offer and the answer, so this is all the audio the App needs; the real implementation carries sound, and `fakeVoiceConnection` carries none, for stories and development.
 */
export interface VoiceConnection {
  // Opens the connection and returns the offer the Voice provider answers.
  createOffer: () => Promise<string>;
  // Completes the connection with the provider's answer.
  accept: (answer: string) => Promise<void>;
  // Hangs up and releases the microphone.
  close: () => void;
}

export const fakeVoiceConnection: VoiceConnection = {
  createOffer: () => Promise.resolve('fake-offer'),
  accept: () => Promise.resolve(),
  close: () => {},
};
