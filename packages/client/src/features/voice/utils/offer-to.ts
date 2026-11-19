import type { VoiceConnection } from '../types/voice-connection';

// A refused microphone means no offer, so no call starts and the Composer stays where it was.
export const offerTo = (
  connection: VoiceConnection | null,
  send: (offer: string) => Promise<void> | void,
): Promise<void> | undefined =>
  connection
    ?.createOffer()
    .then(send)
    .catch(() => connection.close());
