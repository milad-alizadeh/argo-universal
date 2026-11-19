import type { VoiceCall } from '@repo/contracts';
import { useMemo } from 'react';
import { useSessionMutes } from './use-session-mutes';
import { useVoiceStatus } from './use-voice-status';
import { useVoiceConnection } from './voice-connection-context';

// The live Voice call as the Sessions list marks it: its Session, when it connected, and whether the mic is muted.
export interface ListedCall {
  sessionId: string;
  startedAt: string | null;
  muted: boolean;
}

const listedOf = (call: VoiceCall | null, muted: boolean): ListedCall | null =>
  call && { sessionId: call.sessionId, startedAt: call.startedAt, muted };

// The one live call, or none; the mic's mute is this App's, so another Device's call reads unmuted.
export function useListedCall(): ListedCall | null {
  const { call } = useVoiceStatus();
  const muted = useSessionMutes(useVoiceConnection()).mutes.microphone;

  return useMemo(() => listedOf(call, muted), [call, muted]);
}
