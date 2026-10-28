import type { NonUserPromptSender } from '@repo/contracts';
import type { SessionRouterDeps } from './router-deps';

// The authenticated caller chooses the identity; Hooks and prompt JSON never do.
export function sessionPromptSender(
  readSession: SessionRouterDeps['readSession'],
  sessionId: string,
): NonUserPromptSender {
  return {
    type: 'session',
    sessionId,
    title: readSession(sessionId).title.trim() || 'Session',
  };
}
