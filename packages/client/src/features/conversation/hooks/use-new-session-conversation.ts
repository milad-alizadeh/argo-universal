import type { ComposerConversation } from '#features/composer';
import { sessionHref } from '#lib/product/navigation/navigation';
import { useNavigateFromShown } from '#lib/product/navigation/use-navigate-from-shown';
import { useConversationConnection } from '../stores/conversation-connection-context';
import type { ConversationConnection } from '../types/conversation-connection';
import {
  type NewSessionConversationInput,
  newSessionConversation,
} from '../utils/session-conversation';
import { useSessionTitle, useStartCall } from './use-conversation-reads';
import { useConversationStatus } from './use-conversation-status';

// Opens the Session the call is for, then starts the call in it once it exists.
export type OpenForCall = (start: (sessionId: string) => void) => void;

function useActions(
  connection: ConversationConnection | null,
  openForCall: OpenForCall,
): NewSessionConversationInput['actions'] {
  const start = useStartCall(connection);
  const navigate = useNavigateFromShown();

  return {
    start: () => openForCall(start),
    open: (target) => navigate(sessionHref(target)),
  };
}

function useInput(
  connection: ConversationConnection | null,
  openForCall: OpenForCall,
): NewSessionConversationInput {
  const status = useConversationStatus();
  const callSession = status.conversation?.sessionId;
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
export function useNewSessionConversation(
  openForCall: OpenForCall,
): ComposerConversation | undefined {
  const connection = useConversationConnection();
  const slot = newSessionConversation(useInput(connection, openForCall));

  return connection ? slot : undefined;
}
