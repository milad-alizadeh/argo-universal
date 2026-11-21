import {
  conversationSessions,
  type ConversationSessionWork,
} from '../conversation';
import type { Sessions } from '../sessions';
import type { AppRouterDeps } from './router-deps';

// What the Conversation does through Sessions: send Prompts, stop a Turn, answer a Permission request, hear Turns end, and, with the screen, ask for a picture of it.
const conversationWork = ({
  conversation,
}: Sessions): Omit<ConversationSessionWork, 'capture'> => ({
  promptFromConversation: (sessionId, text) =>
    conversation.promptFromConversation(sessionId, text),
  stopFromConversation: (sessionId) =>
    conversation.stopFromConversation(sessionId),
  answerFromConversation: (sessionId, requestId, kind) =>
    conversation.answerFromConversation(sessionId, requestId, kind),
  agentName: (agentId) => conversation.agentName(agentId),
  watchTurns: (sessionId, listener) =>
    conversation.watchTurns(sessionId, listener),
  watchStarted: (starterId, observer) =>
    conversation.watchStarted(starterId, observer),
});

// Gives the Engine's Conversations the Sessions' work to go through.
export const attachConversation = (
  deps: AppRouterDeps,
  sessions: Sessions,
): void => {
  deps.conversation.attach(
    conversationSessions(deps, {
      ...conversationWork(sessions),
      capture: (sessionId) =>
        deps.screenSight.capture({ kind: 'voice', sessionId }),
    }),
  );
};
