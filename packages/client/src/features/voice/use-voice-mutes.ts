import { useEffect, useState } from 'react';
import type { ComposerVoice } from '#features/composer';
import type { VoiceConnection } from './voice-connection';

type Mutes = NonNullable<ComposerVoice['mutes']>;

// What the person muted on one call; a call of another id starts unmuted.
type Held = {
  callId: string | undefined;
  microphone: boolean;
  speaker: boolean;
};

const unmuted = (callId: string | undefined): Held => ({
  callId,
  microphone: false,
  speaker: false,
});

const heldFor = (held: Held, callId: string | undefined): Held =>
  held.callId === callId ? held : unmuted(callId);

// What the connection does is what the buttons show: it is told each time a mute changes.
function useAppliedMutes(
  connection: VoiceConnection | null,
  { microphone, speaker }: Held,
): void {
  useEffect(
    () => connection?.setMicrophoneMuted(microphone),
    [connection, microphone],
  );
  useEffect(() => connection?.setSpeakerMuted(speaker), [connection, speaker]);
}

/*
 * The mic and speaker mutes live in the App: the connection holds them, and nothing about them reaches the Server.
 * Both start unmuted with each call.
 */
export function useVoiceMutes(
  connection: VoiceConnection | null,
  callId: string | undefined,
): Mutes {
  const [stored, setStored] = useState(unmuted(callId));
  const held = heldFor(stored, callId);
  useAppliedMutes(connection, held);

  return {
    ...held,
    onMicrophone: () => setStored({ ...held, microphone: !held.microphone }),
    onSpeaker: () => setStored({ ...held, speaker: !held.speaker }),
  };
}
