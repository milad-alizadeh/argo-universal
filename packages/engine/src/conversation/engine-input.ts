import type { ConversationHistorySources } from '../feed';
import { createSessionReader } from '../sessions';
import { briefingOf } from './briefing';
import { FakeConversationProvider } from './fake-provider';
import type { CodexAuth } from './gpt-live/codex-auth';
import { createGptLiveProvider } from './gpt-live/gpt-live-provider';
import type { ConversationProvider } from './provider';

// The Conversation provider a Server uses unless it is given one: the fake for development when asked for, otherwise GPT-Live.
export function defaultConversationProvider(
  environment: NodeJS.ProcessEnv,
  auth?: CodexAuth,
): ConversationProvider | null {
  return environment.ARGO_CONVERSATION_PROVIDER === 'fake'
    ? new FakeConversationProvider()
    : createGptLiveProvider(auth && { auth });
}

// What the voice is told about a Session before it speaks: its title, working folder and recent Feed.
export function sessionBriefing(
  sources: ConversationHistorySources,
): (sessionId: string) => string {
  const read = createSessionReader(sources.database);

  return (sessionId) => {
    const { title, checkout } = read(sessionId);

    return briefingOf(sources, { id: sessionId, title, folder: checkout.path });
  };
}
