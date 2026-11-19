import { useSyncExternalStore } from 'react';
import type { VoiceConnection, VoiceMutes } from './voice-connection';

const unmuted: VoiceMutes = { microphone: false, speaker: false };

const readUnmuted = (): VoiceMutes => unmuted;

const listenToNothing = (): (() => void) => (): void => {};

/*
 * What the connection holds muted, followed from the connection. This only reads: no page ever writes a mute on
 * mount, so opening another Session leaves the microphone as it was. With no connection, nothing is muted.
 */
export function useConnectionMutes(
  connection: VoiceConnection | null,
): VoiceMutes {
  return useSyncExternalStore(
    connection?.subscribe ?? listenToNothing,
    connection?.mutes ?? readUnmuted,
  );
}
