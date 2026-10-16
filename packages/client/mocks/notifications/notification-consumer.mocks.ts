import type { NotificationStreamEvent } from '@repo/contracts';
import type { NotificationClient } from '../../src/features/notifications/notification-consumer';

export const heartbeatMs = 15_000;

// The Server transport: records what the App sends and can refuse it.
export interface FakeNotificationClient {
  client: NotificationClient;
  attentionReports: (string | null)[];
  acknowledged: string[];
  failCalls: () => void;
}

interface Endpoint<Recorded, Input> {
  log: Recorded[];
  mutate: (input: Input) => Promise<boolean>;
}

function endpoint<Recorded, Input>(
  pick: (input: Input) => Recorded,
  refusing: () => boolean,
): Endpoint<Recorded, Input> {
  const log: Recorded[] = [];

  return {
    log,
    mutate: (input) => {
      log.push(pick(input));

      return refusing()
        ? Promise.reject(new Error('Connection lost'))
        : Promise.resolve(true);
    },
  };
}

interface Endpoints {
  attention: Endpoint<string | null, { sessionId: string | null }>;
  acknowledge: Endpoint<string, { id: string }>;
}

function endpoints(refusing: () => boolean): Endpoints {
  return {
    attention: endpoint(
      (input: { sessionId: string | null }) => input.sessionId,
      refusing,
    ),
    acknowledge: endpoint((input: { id: string }) => input.id, refusing),
  };
}

export function fakeNotificationClient(): FakeNotificationClient {
  const fault = { refusing: false };
  const { attention, acknowledge } = endpoints(() => fault.refusing);

  return {
    attentionReports: attention.log,
    acknowledged: acknowledge.log,
    failCalls: () => {
      fault.refusing = true;
    },
    client: { notifications: { attention, acknowledge } },
  };
}

export const ready: NotificationStreamEvent = {
  type: 'ready',
  serverId: 'server-1',
  heartbeatMs,
};

const base = {
  serverId: 'server-1',
  sessionId: 'session-a',
  title: 'Done',
  occurredAt: 1,
};

export function turnEnded(
  id: string,
  serverId = 'server-1',
): NotificationStreamEvent {
  return {
    type: 'notification',
    notification: {
      ...base,
      id,
      serverId,
      kind: 'turn_ended',
      turnId: `t-${id}`,
    },
  };
}
