import type { OpenSessionsActorRef } from './open-sessions-machine';
import type { SessionActorRef } from './session-machine';
import { hasRunningSubagentTurn } from './subagents';

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

export type EndedTurn = { sessionId: string; projectId: string };

// What the end watcher needs to know of an open Session.
export type TurnView = EndedTurn & { activeTurnId: string | null };

type TurnSource = {
  views: () => TurnView[];
  subscribe: (listener: () => void) => () => void;
};

/*
 * Runs `ended` once for each Session whose own Turn ends, whenever the source changes. A Session that closes
 * mid-Turn leaves the list without ending one, and a subagent's Turn is not the Session's.
 */
export function trackTurnEnds(
  source: TurnSource,
  ended: (turn: EndedTurn) => void,
): () => void {
  const running = new Set<string>();

  return source.subscribe(() => {
    const views = source.views();

    for (const view of views) noticeTurn(view, running, ended);
    forgetClosed(views, running);
  });
}

// A Session that closed mid-Turn never ends one, so it stops being tracked.
function forgetClosed(views: TurnView[], running: Set<string>): void {
  const open = new Set(views.map(({ sessionId }) => sessionId));

  for (const sessionId of running)
    if (!open.has(sessionId)) running.delete(sessionId);
}

function noticeTurn(
  { sessionId, projectId, activeTurnId }: TurnView,
  running: Set<string>,
  ended: (turn: EndedTurn) => void,
): void {
  if (activeTurnId !== null) {
    running.add(sessionId);

    return;
  }

  if (running.delete(sessionId)) ended({ sessionId, projectId });
}

const viewsOf = (sessions: OpenSessionsActorRef): TurnView[] =>
  Object.values(sessions.getSnapshot().context.sessions).map(
    (session) => session.getSnapshot().context,
  );

function subscriberOf(sessions: OpenSessionsActorRef): TurnSource['subscribe'] {
  return (listener): (() => void) => {
    const subscription = sessions.subscribe(listener);

    return (): void => subscription.unsubscribe();
  };
}

// The open Sessions' own Turns ending, as Open Sessions forwards each Session's snapshot.
export function watchTurnEnds(
  sessions: OpenSessionsActorRef,
  ended: (turn: EndedTurn) => void,
): () => void {
  const source = {
    views: (): TurnView[] => viewsOf(sessions),
    subscribe: subscriberOf(sessions),
  };

  return trackTurnEnds(source, ended);
}
