import type {
  ConnectionActor,
  ConnectionClock,
} from './connection-machine.mocks';

type Timers = Map<
  number,
  { callback: Parameters<ConnectionClock['setTimeout']>[0]; delay: number }
>;

export interface ModelClock {
  clock: ConnectionClock;
  fire: (connection: ConnectionActor, eventType: string) => void;
}

const scheduledDelay = (
  connection: ConnectionActor,
  eventType: string,
): number => {
  const event = Object.values(
    connection.system.getSnapshot()._scheduledEvents,
  ).find((scheduled) => scheduled.event.type === eventType);

  if (!event) throw new Error(`No event scheduled for ${eventType}`);

  return event.delay;
};

// Select the actual scheduled callback so simultaneous retry and offline paths stay independent.
const fireScheduled = (
  timers: Timers,
  connection: ConnectionActor,
  eventType: string,
): void => {
  const delay = scheduledDelay(connection, eventType);
  const scheduled = [...timers].find(([, timer]) => timer.delay === delay);

  if (!scheduled) throw new Error(`No callback scheduled for ${eventType}`);
  timers.delete(scheduled[0]);
  scheduled[1].callback();
};

const createClock = (timers: Timers): ConnectionClock => {
  const ids = { next: 0 };

  return {
    setTimeout: (callback, delay): number => {
      timers.set(ids.next, { callback, delay });

      return ids.next++;
    },
    clearTimeout: (id: number): void => {
      timers.delete(id);
    },
  };
};

export const createModelClock = (): ModelClock => {
  const timers: Timers = new Map();

  return {
    clock: createClock(timers),
    fire: (connection, eventType): void =>
      fireScheduled(timers, connection, eventType),
  };
};
