import { TRPCError } from '@trpc/server';
import type { SessionCommand, SessionContext } from './session-context';

export type QueueEditDisconnected = {
  type: 'session.queueEditDisconnected';
  id: string;
  token: string;
};

type HoldConnection = { token: string; stop: () => void };

export interface QueueHoldConnections {
  [id: string]: HoldConnection;
}

type QueueEvent = Extract<SessionCommand, { type: 'session.queue' }>;

type Disconnected = (event: QueueEditDisconnected) => void;

type HoldsContext = Pick<SessionContext, 'queueHolds' | 'queueHoldConnections'>;

export function requireQueueConnection(event: QueueEvent): void {
  if (event.command.action !== 'hold') return;

  if (!event.connectionSignal)
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Editing needs a live App Connection',
    });
  event.connectionSignal.throwIfAborted();
}

type HoldChange = {
  holds: SessionContext['queueHolds'];
  disconnected: Disconnected;
};

export function reconcileQueueHolds(
  context: HoldsContext,
  event: QueueEvent,
  change: HoldChange,
): QueueHoldConnections {
  const connections = retainedConnections(
    context.queueHoldConnections,
    change.holds,
  );

  if (event.command.action === 'hold')
    connectHold(connections, event, change.disconnected);

  return connections;
}

function retainedConnections(
  connections: QueueHoldConnections,
  holds: SessionContext['queueHolds'],
): QueueHoldConnections {
  const retained: QueueHoldConnections = {};

  for (const [id, connection] of Object.entries(connections)) {
    if (holds[id] === connection.token) retained[id] = connection;
    else connection.stop();
  }

  return retained;
}

function connectHold(
  connections: QueueHoldConnections,
  event: QueueEvent,
  disconnected: Disconnected,
): void {
  const hold = connectedHold(event);

  if (!hold) return;

  if (connections[hold.target.id]) return;
  connections[hold.target.id] = watchHold(
    hold.signal,
    hold.target,
    disconnected,
  );
}

function watchHold(
  signal: AbortSignal,
  target: Pick<QueueEditDisconnected, 'id' | 'token'>,
  disconnected: Disconnected,
): HoldConnection {
  const release = (): void =>
    disconnected({ type: 'session.queueEditDisconnected', ...target });

  signal.addEventListener('abort', release, { once: true });

  return {
    token: target.token,
    stop: () => signal.removeEventListener('abort', release),
  };
}

export function disconnectedQueueHold(
  context: HoldsContext,
  event: QueueEditDisconnected,
): Partial<HoldsContext> {
  if (context.queueHolds[event.id] !== event.token) return {};
  const queueHolds = { ...context.queueHolds };
  delete queueHolds[event.id];

  return {
    queueHolds,
    queueHoldConnections: retainedConnections(
      context.queueHoldConnections,
      queueHolds,
    ),
  };
}

export function stopQueueHolds(
  context: Pick<HoldsContext, 'queueHoldConnections'>,
): void {
  for (const connection of Object.values(context.queueHoldConnections))
    connection.stop();
}

type ConnectedHold = {
  signal: AbortSignal;
  target: Pick<QueueEditDisconnected, 'id' | 'token'>;
};

function connectedHold({
  command,
  connectionSignal,
}: QueueEvent): ConnectedHold | null {
  return command.action === 'hold' && connectionSignal
    ? {
        signal: connectionSignal,
        target: { id: command.id, token: command.token },
      }
    : null;
}
