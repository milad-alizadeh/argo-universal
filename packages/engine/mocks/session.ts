import type { AgentAdapter } from '@repo/agents';
import type { Database } from '@repo/db';
import type { FeedActorRef } from '../src/services/feed';
import {
  findSessionActor,
  type SessionActorRef,
  type SessionCommand,
} from '../src/services/sessions';
import { startRouterTestHost } from './router';

export const firstPrompt: Extract<SessionCommand, { type: 'session.prompt' }> =
  { type: 'session.prompt', turnId: 'turn-1', content: [] };

export function createSessionHost(
  database: Database,
  adapter: AgentAdapter,
): ReturnType<typeof startRouterTestHost> & {
  session: SessionActorRef;
  findFeed: () => FeedActorRef | undefined;
} {
  const sessionHost = startRouterTestHost({ database, adapters: [adapter] });
  sessionHost.sessionRegistry.send({
    type: 'sessions.open',
    sessionId: 'session-1',
    agent: adapter.agent,
  });
  const session = findSessionActor(
    sessionHost.sessionRegistry.system,
    'session-1',
  );
  if (!session) throw new Error('Session not started');
  return {
    ...sessionHost,
    session,
    findFeed: (): FeedActorRef | undefined =>
      session.getSnapshot().children.feed,
  };
}
