import { useSyncExternalStore } from 'react';
import type { VoiceConnection, VoiceMutes } from '../types/conversation-connection';

const unmuted: VoiceMutes = { microphone: false, speaker: false };

// What there is to follow when the App carries no audio: nothing is ever muted.
const nobody: Pick<VoiceConnection, 'mutes' | 'subscribe'> = {
  mutes: () => unmuted,
  subscribe: () => (): void => {},
};

export interface SessionMutes {
  // What the connection holds muted.
  mutes: VoiceMutes;
  setMicrophoneMuted: (muted: boolean) => void;
  setSpeakerMuted: (muted: boolean) => void;
}

/*
 * How a Session page reaches the mutes: it reads what the connection holds and asks it to change them on a press. It
 * writes nothing on mount, so opening another Session leaves the microphone as it was. The page's hook and the
 * Composer's stories both mount this one.
 */
export function useSessionMutes(
  connection: VoiceConnection | null,
): SessionMutes {
  const source = connection ?? nobody;
  const mutes = useSyncExternalStore(source.subscribe, source.mutes);

  return {
    mutes,
    setMicrophoneMuted: (muted) => connection?.setMicrophoneMuted(muted),
    setSpeakerMuted: (muted) => connection?.setSpeakerMuted(muted),
  };
}
