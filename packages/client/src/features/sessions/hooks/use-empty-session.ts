import type { SessionConfigOption, SessionNewInput } from '@repo/contracts';
import { useActorRef, useSelector } from '@xstate/react';
import { useCallback, useEffect } from 'react';
import type { ActorRefFrom } from 'xstate';
import {
  type ConfigurationChange,
  nextRememberedChange,
} from '#features/composer';
import { useResubscribeOnReconnect, useTRPCClient } from '#features/connection';
import { useNavigate } from '#lib/product/navigation/context';
import {
  type EmptySessionContext,
  type EmptySessionPorts,
  emptySessionMachine,
} from '../state/empty-session-machine';

export type EmptySessionActor = ActorRefFrom<typeof emptySessionMachine>;
type Snapshot = ReturnType<EmptySessionActor['getSnapshot']>;
type Client = ReturnType<typeof useTRPCClient>;

export interface EmptySession {
  actor: EmptySessionActor;
  context: EmptySessionContext;
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

// Closing on the way out can fail with the Connection; nothing waits for it.
const closeQuietly = (client: Client, sessionId: string): void => {
  client.session.close.mutate({ sessionId }).catch(() => {});
};

// A Session that opens after the screen was left is closed at once.
const openSession = async (
  client: Client,
  input: SessionNewInput,
  signal: AbortSignal,
): Promise<{ sessionId: string }> => {
  const opened = await client.session.new.mutate(input);
  if (signal.aborted) closeQuietly(client, opened.sessionId);
  return opened;
};

const setConfigOption = async (
  client: Client,
  sessionId: string,
  { configId, value }: ConfigurationChange,
): Promise<SessionConfigOption[]> => {
  const changed = await client.session.setConfigOption.mutate({
    sessionId,
    configId,
    type: 'id',
    value,
  });
  return changed.configOptions;
};

// The Server calls the machine makes.
function useEmptySessionPorts(): EmptySessionPorts {
  const client = useTRPCClient();
  const navigate = useNavigate();
  return {
    open: (input, signal) => openSession(client, input, signal),
    close: (sessionId) => client.session.close.mutate({ sessionId }),
    setConfigOption: (sessionId, change) =>
      setConfigOption(client, sessionId, change),
    prompt: (sessionId, prompt) =>
      client.session.prompt.mutate({ sessionId, prompt }),
    handOff: (id) => navigate({ to: 'session', id }, { replace: true }),
    nextChange: nextRememberedChange,
  };
}

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

// The choices reach the machine on every change; a failed open tries again when the Connection reopens.
function useChoices(
  actor: EmptySessionActor,
  input: SessionNewInput | undefined,
  connected: boolean,
): void {
  useEffect(() => {
    actor.send({ type: 'choices.changed', input, connected });
  }, [actor, input, connected]);
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
  context: snapshot.context,
  openSessionId: openSessionOf(snapshot),
  opening: isOpening(snapshot),
  handedOff: snapshot.status === 'done',
});

// New Session's real, empty Session for the current choices; leaving without sending closes it.
export function useEmptySession(
  input: SessionNewInput | undefined,
  connected: boolean,
): EmptySession {
  const actor = useActorRef(emptySessionMachine, {
    input: useEmptySessionPorts(),
  });
  useCloseOnLeave(actor);
  useChoices(actor, input, connected);
  return toEmptySession(
    actor,
    useSelector(actor, (current) => current),
  );
}
