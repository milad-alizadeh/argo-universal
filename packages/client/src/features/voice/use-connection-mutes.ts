import { useSyncExternalStore } from 'react';
import type { VoiceConnection, VoiceMutes } from './voice-connection';

const unmuted: VoiceMutes = { microphone: false, speaker: false };

// What there is to follow when the App carries no audio: nothing is ever muted.
const nobody: Pick<VoiceConnection, 'mutes' | 'subscribe'> = {
  mutes: () => unmuted,
  subscribe: () => (): void => {},
};

/*
 * What the connection holds muted, followed from the connection. This only reads: no page ever writes a mute on
 * mount, so opening another Session leaves the microphone as it was.
 */
export function useConnectionMutes(
  connection: VoiceConnection | null,
): VoiceMutes {
  const source = connection ?? nobody;

  return useSyncExternalStore(source.subscribe, source.mutes);
}
