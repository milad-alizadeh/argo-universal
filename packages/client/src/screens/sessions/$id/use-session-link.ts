import { useConnectionState } from '#features/connection';
import { useSessionVoice } from '#features/voice';
import type { OpenSession } from './session-composer-props';

// What links the page to the Device it runs on: whether its Connection is open, and the Voice call as this Session sees it.
export function useSessionLink(
  sessionId: string,
): Pick<OpenSession, 'connected' | 'voice' | 'partials' | 'stage'> {
  return {
    connected: useConnectionState() === 'open',
    ...useSessionVoice(sessionId),
  };
}
