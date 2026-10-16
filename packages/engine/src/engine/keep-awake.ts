import { fromCallback, type EventObject } from 'xstate';
import { findMachineActor } from '../lib/machine-actor';
import {
  openSessionsId,
  openSessionsMachine,
  type OpenSessionsActorRef,
} from '../sessions';
import { caffeinate, type Caffeinate } from './caffeinate';

export type KeepAwakeInput = { caffeinate?: Caffeinate };

/*
 * Open Sessions forwards every Session snapshot through syncSnapshot.
 * Read Turn ownership there; an idle Agent session must not keep the Mac awake.
 */
export const caffeinateActor = fromCallback<EventObject, KeepAwakeInput>(
  ({ input, self }) => {
    const sessions = findMachineActor(
      self.system,
      openSessionsId,
      openSessionsMachine,
    );

    if (!sessions) throw new Error('Keep awake requires open Sessions');

    return new IdleSleepAssertion(input.caffeinate ?? caffeinate).watch(
      sessions,
    );
  },
);

class IdleSleepAssertion {
  private stop: (() => void) | undefined;

  public constructor(private readonly acquire: Caffeinate) {}

  public watch(sessions: OpenSessionsActorRef): () => void {
    const subscription = sessions.subscribe(() => this.update(sessions));
    this.update(sessions);

    return (): void => {
      subscription.unsubscribe();
      this.release();
    };
  }

  public update(sessions: OpenSessionsActorRef): void {
    const active = Object.values(sessions.getSnapshot().context.sessions).some(
      (session) => session.getSnapshot().context.activeTurnId !== null,
    );

    if (!active) return this.release();
    this.stop ??= this.acquire(process.pid);
  }

  public release(): void {
    this.stop?.();
    this.stop = undefined;
  }
}
