import type { ComposerVoice } from '#features/composer';
import { sessionHref } from '#lib/product/navigation/navigation';
import { useNavigateFromShown } from '#lib/product/navigation/use-navigate-from-shown';
import { useVoiceConnection } from '../stores/conversation-connection-context';
import type { VoiceConnection } from '../types/conversation-connection';
import {
  type NewSessionVoiceInput,
  newSessionVoice,
} from '../utils/session-conversation';
import { useSessionTitle, useStartCall } from './use-conversation-reads';
import { useVoiceStatus } from './use-conversation-status';

// Opens the Session the call is for, then starts the call in it once it exists.
export type OpenForCall = (start: (sessionId: string) => void) => void;

function useActions(
  connection: VoiceConnection | null,
  openForCall: OpenForCall,
): NewSessionVoiceInput['actions'] {
  const start = useStartCall(connection);
  const navigate = useNavigateFromShown();

  return {
    start: () => openForCall(start),
    open: (target) => navigate(sessionHref(target)),
  };
}

function useInput(
  connection: VoiceConnection | null,
  openForCall: OpenForCall,
): NewSessionVoiceInput {
  const status = useVoiceStatus();
  const callSession = status.call?.sessionId;
  const title = useSessionTitle(callSession);

  return {
    status,
    titleOf: (id) => (id === callSession ? title : undefined),
    actions: useActions(connection, openForCall),
  };
}

/*
 * New Session's voice slot: the same voice button as a Session page, which opens the Session first and starts the
 * call there, or the pointer to a call already running in a Session. Absent where this App carries no audio.
 */
export function useNewSessionVoice(
  openForCall: OpenForCall,
): ComposerVoice | undefined {
  const connection = useVoiceConnection();
  const slot = newSessionVoice(useInput(connection, openForCall));

  return connection ? slot : undefined;
}
