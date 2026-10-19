import { fromCallback, type EventObject } from 'xstate';
import { findMachineActor } from '../lib/machine-actor';
import {
  openSessionsId,
  openSessionsMachine,
  type OpenSessionsActorRef,
  watchTurnActivity,
} from '../sessions';
import { caffeinate, type Caffeinate } from './caffeinate';

export type KeepAwakeInput = { caffeinate?: Caffeinate };

/*
 * The Mac stays awake while any Turn runs; an idle Agent session must not keep it awake.
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
    const unwatch = watchTurnActivity(sessions, (active) =>
      active ? this.hold() : this.release(),
    );

    return (): void => {
      unwatch();
      this.release();
    };
  }

  private hold(): void {
    this.stop ??= this.acquire(process.pid);
  }

  private release(): void {
    this.stop?.();
    this.stop = undefined;
  }
}
