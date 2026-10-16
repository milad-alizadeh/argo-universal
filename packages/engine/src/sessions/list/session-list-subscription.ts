import { EventEmitter, on } from 'node:events';
import type { Subscription } from 'xstate';
import { throwListFailure, type ListActor } from './session-list-failure';
import type { SessionListState } from './session-list-machine';

type ListStream<Value> = { stream: AsyncIterable<Value[]>; close: () => void };

export class SessionListSubscription<Value> {
  private readonly events = new EventEmitter<{ change: [Value] }>();
  private readonly controller = new AbortController();
  private attached = true;
  private rowsListener: Subscription | undefined;
  private completion: Subscription | undefined;
  public constructor(
    private readonly actor: ListActor,
    private readonly select: (rows: SessionListState) => Value[],
    private readonly release: () => void,
  ) {}

  public async *watch(
    signal: AbortSignal | undefined,
    first: boolean,
  ): AsyncGenerator<Value> {
    const { stream, close } = this.open(signal);

    try {
      yield* this.read(stream, first);
    } finally {
      close();
    }
  }

  private open(signal: AbortSignal | undefined): ListStream<Value> {
    this.attach();

    const stream: AsyncIterable<Value[]> = on(this.events, 'change', {
      signal: this.controller.signal,
    });

    this.watchCompletion();

    const abort = (): void => this.abort();

    signal?.addEventListener('abort', abort);

    return {
      stream,
      close: (): void => this.close(signal, abort),
    };
  }

  private abort(): void {
    this.controller.abort();
    this.detach();
  }

  private close(signal: AbortSignal | undefined, abort: () => void): void {
    abort();
    signal?.removeEventListener('abort', abort);
  }

  private async *read(
    stream: AsyncIterable<Value[]>,
    first: boolean,
  ): AsyncGenerator<Value> {
    try {
      this.start(first);

      yield* streamChanges(stream);
    } catch (error) {
      throwListFailure(this.actor);

      if (!this.controller.signal.aborted) throw error;
    }
  }

  private attach(): void {
    this.rowsListener = this.actor.on('list.rows', ({ rows }): void =>
      this.publish(rows),
    );
  }

  private watchCompletion(): void {
    this.completion = this.actor.subscribe({
      complete: (): void => this.controller.abort(),
      error: (error): void => this.controller.abort(error),
    });
  }

  private start(first: boolean): void {
    if (first) this.actor.start();
    else {
      const rows = this.actor.getSnapshot().context.rows;

      if (rows) this.publish(rows);
    }
  }

  private publish(rows: SessionListState): void {
    for (const change of this.select(rows)) this.events.emit('change', change);
  }

  private unsubscribeListeners(): void {
    this.rowsListener?.unsubscribe();
    this.completion?.unsubscribe();
  }

  private detach(): void {
    if (!this.attached) return;
    this.attached = false;
    this.unsubscribeListeners();
    this.release();
  }
}

async function* streamChanges<Value>(
  stream: AsyncIterable<Value[]>,
): AsyncGenerator<Value> {
  for await (const changes of stream) yield* changes;
}
