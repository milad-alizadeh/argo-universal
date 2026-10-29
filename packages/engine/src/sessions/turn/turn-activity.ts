import type { OpenSessionsActorRef } from '../open-sessions-machine';
import type { SessionActorRef } from '../session-machine';
import { hasRunningSubagentTurn } from '../subagents';

/*
 * Whether any open Session has a Turn running, its own or a subagent's.
 * Open Sessions forwards every Session snapshot through syncSnapshot, so a
 * Session that closes mid-Turn stops counting as soon as it leaves the list.
 * `changed` runs once at the start, then on every switch between idle and active.
 */
export function watchTurnActivity(
  sessions: OpenSessionsActorRef,
  changed: (active: boolean) => void,
): () => void {
  let active = anyTurnActive(sessions);

  const subscription = sessions.subscribe(() => {
    const next = anyTurnActive(sessions);

    if (next === active) return;
    active = next;
    changed(active);
  });

  changed(active);

  return (): void => subscription.unsubscribe();
}

function anyTurnActive(sessions: OpenSessionsActorRef): boolean {
  return Object.values(sessions.getSnapshot().context.sessions).some(
    hasActiveTurn,
  );
}

function hasActiveTurn(session: SessionActorRef): boolean {
  const { activeTurnId, subagents } = session.getSnapshot().context;

  return activeTurnId !== null || hasRunningSubagentTurn(subagents);
}
