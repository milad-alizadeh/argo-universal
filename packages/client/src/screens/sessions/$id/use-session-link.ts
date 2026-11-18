import { useConnectionState } from '#features/connection';
import { useVoiceCall, useVoicePartials } from '#features/voice';
import type { OpenSession } from './session-composer-props';

// What links the page to the Device it runs on: whether its Connection is open, and the Voice call its audio can carry.
export function useSessionLink(
  sessionId: string,
): Pick<OpenSession, 'connected' | 'voice' | 'partials'> {
  return {
    connected: useConnectionState() === 'open',
    voice: useVoiceCall(sessionId),
    partials: useVoicePartials(sessionId),
  };
}
