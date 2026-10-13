import type { SessionNewInput } from '@repo/contracts';
import { useActorRef, useSelector } from '@xstate/react';
import { useCallback, useEffect, useRef } from 'react';
import type { ActorRefFrom } from 'xstate';
import { useResubscribeOnReconnect, useTRPCClient } from '#features/connection';
import { emptySessionMachine } from '../../state/empty-session-machine';
import { closeQuietly, useEmptySessionPorts } from './empty-session-adapters';

export type EmptySessionActor = ActorRefFrom<typeof emptySessionMachine>;

type Snapshot = ReturnType<EmptySessionActor['getSnapshot']>;

export interface EmptySession {
  actor: EmptySessionActor;
  error: string | undefined;
  pendingPrompt: boolean;
  // The open Session the page reads options from, until it hands it on.
  openSessionId: string | undefined;
  // True while the Session opens, reopens or takes this device's last choices.
  opening: boolean;
  handedOff: boolean;
}

const openingStates = [
  'opening',
  'closing',
  { open: 'loading' },
  { open: 'applyingRemembered' },
] as const;

const waitingToOpen = ({ context, ...snapshot }: Snapshot): boolean =>
  snapshot.matches('waiting') &&
  [context.connected, context.input !== undefined].every(Boolean);

const isOpening = (snapshot: Snapshot): boolean =>
  openingStates.some((state) => snapshot.matches(state)) ||
  waitingToOpen(snapshot);

// Left with an empty Session open, the screen closes it; a prompted one is the Session page's.
const ownsOpenSession = (snapshot: Snapshot): boolean =>
  [
    snapshot.context.sessionId !== undefined,
    snapshot.status === 'active',
    !snapshot.matches('closing'),
    !snapshot.matches({ open: 'prompting' }),
  ].every(Boolean);

const openSessionOf = (snapshot: Snapshot): string | undefined =>
  snapshot.matches('open') || snapshot.status === 'done'
    ? snapshot.context.sessionId
    : undefined;

// StrictMode's rehearsal unmount comes before any Session opens; a reload or a lost Connection sends nothing.
function useCloseOnLeave(actor: EmptySessionActor): void {
  const client = useTRPCClient();
  useEffect(
    () => (): void => {
      const last = actor.getSnapshot();

      if (ownsOpenSession(last) && last.context.sessionId)
        closeQuietly(client, last.context.sessionId);
    },
    [actor, client],
  );
}

// Each render builds the input anew; the machine hears of it only when its value changes.
function useChoices(
  actor: EmptySessionActor,
  input: SessionNewInput | undefined,
  connected: boolean,
): void {
  const latestInput = useRef(input);
  useEffect(() => {
    latestInput.current = input;
  });
  const choiceKey = JSON.stringify(input ?? null);
  useEffect(() => {
    const changed = { input: latestInput.current, connected };
    actor.send({ type: 'choices.changed', ...changed });
  }, [actor, choiceKey, connected]);
}

// A failed open tries again when the Connection reopens.
function useRetryOnReconnect(actor: EmptySessionActor): void {
  const failed = useSelector(actor, (snapshot) => snapshot.matches('failed'));
  const retry = useCallback(() => actor.send({ type: 'retry' }), [actor]);
  useResubscribeOnReconnect({
    status: failed ? 'error' : 'idle',
    reset: retry,
  });
}

const toEmptySession = (
  actor: EmptySessionActor,
  snapshot: Snapshot,
): EmptySession => ({
  actor,
  error: snapshot.context.error,
  pendingPrompt: snapshot.context.pendingPrompt !== undefined,
  openSessionId: openSessionOf(snapshot),
  opening: isOpening(snapshot),
  handedOff: snapshot.status === 'done',
});

// New Session's real, empty Session for the current choices; leaving without sending closes it.
export function useEmptySession(
  input: SessionNewInput | undefined,
  connected: boolean,
  clearDraft: () => void,
): EmptySession {
  const ports = useEmptySessionPorts(clearDraft);
  const actor = useActorRef(emptySessionMachine, { input: ports });

  useCloseOnLeave(actor);
  useChoices(actor, input, connected);
  useRetryOnReconnect(actor);

  return toEmptySession(
    actor,
    useSelector(actor, (current) => current),
  );
}
