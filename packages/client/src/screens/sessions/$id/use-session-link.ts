import { useConnectionState } from '#features/connection';
import { useSessionVoice, type VoicePage } from '#features/voice';
import type { OpenSession } from './session-composer-props';

// What links the page to the Device it runs on: whether its Connection is open, and the Voice call as this Session sees it.
export function useSessionLink(
  page: VoicePage,
): Pick<OpenSession, 'connected' | 'voice' | 'partials' | 'stage'> {
  return {
    connected: useConnectionState() === 'open',
    ...useSessionVoice(page),
  };
}
