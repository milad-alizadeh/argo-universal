import { createActor, type Actor } from 'xstate';
import { throwListFailure, type ListActor } from './failure';
import {
  sessionListMachine,
  type SessionListMachineInput,
  type SessionListState,
} from './machine';
import { SessionListSubscription } from './subscription';

type AcquiredList = { actor: ListActor; first: boolean };

type ObserverInput = Omit<SessionListMachineInput, 'writer'> & {
  writer: () => SessionListMachineInput['writer'];
};

export class SessionListObserver {
  private actor: ListActor | undefined;
  private references = 0;
  public constructor(private readonly input: ObserverInput) {}

  public readCachedRows(): SessionListState {
    const actor = this.actor ?? this.create().start();

    try {
      actor.send({ type: 'list.flush' });
      throwListFailure(actor);

      return cachedRows(actor);
    } finally {
      if (!this.actor) stopList(actor);
    }
  }

  public async *watch<Value>(
    signal: AbortSignal | undefined,
    select: (rows: SessionListState) => Value[],
  ): AsyncGenerator<Value> {
    if (signal?.aborted) return;
    const { actor, first } = this.acquire();
    this.references += 1;

    const subscription = new SessionListSubscription(actor, select, (): void =>
      this.release(),
    );

    yield* subscription.watch(signal, first);
  }

  private acquire(): AcquiredList {
    const first = this.actor === undefined;
    this.actor ??= this.create();

    return { actor: this.actor, first };
  }

  private release(): void {
    this.references -= 1;

    if (this.references !== 0) return;

    if (this.actor) stopList(this.actor);
    this.actor = undefined;
  }

  private create(): Actor<typeof sessionListMachine> {
    return createActor(sessionListMachine, {
      input: { ...this.input, writer: this.input.writer() },
    });
  }
}

function cachedRows(actor: ListActor): SessionListState {
  return actor.getSnapshot().context.rows ?? [];
}

function stopList(actor: ListActor): void {
  actor.send({ type: 'list.stop' });
  actor.stop();
}
