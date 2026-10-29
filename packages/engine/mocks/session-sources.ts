import { createFeedSources } from '../src/engine/feed-sources';
import {
  createSessionReader,
  type OpenSessionsActorRef,
  type SessionSources,
} from '../src/sessions';

// What a test Engine's open Sessions run Sessions with, as the Engine's composition supplies it.
export function sessionSources(
  sessions: OpenSessionsActorRef,
  sessionCommandSignal?: AbortSignal,
): SessionSources {
  const { database, installedAgents, hooks, createId } =
    sessions.getSnapshot().context;

  return {
    ...createFeedSources({ database, sessions }),
    readSession: createSessionReader(database),
    installedAgents,
    hooks,
    createId,
    sessionCommandSignal,
  };
}
