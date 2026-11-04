import type { PluginEvent } from '../protocol/runtime';
import type {
  CallKind,
  CallOutcome,
  Caller,
  KindCalls,
  WorkerTransport,
} from './worker-calls';

type Waiting<Request, Answer> = Caller & {
  request: Request;
  settle: (outcome: CallOutcome<Answer>) => void;
};

// Ends, as stopped, the waiting calls `matches` picks.
export type Ending = { end: (matches: (caller: Caller) => boolean) => void };

// What a kind's calls need of the table: the running generation and where to send.
type Sending = WorkerTransport & {
  generation: (pluginId: string) => number | undefined;
};

const sameWorker = (left: Caller, right: Caller): boolean =>
  left.pluginId === right.pluginId && left.generation === right.generation;

// The calls of one kind in flight, by id; the table ends them when their generation ends.
export class KindTable<
  Request,
  Answer extends { id: number },
  Result,
> implements KindCalls<Request, Answer, Result> {
  private readonly waiting = new Map<number, Waiting<Request, Answer>>();
  private next = 0;

  public constructor(
    private readonly kind: CallKind<Request, Answer, Result>,
    private readonly sending: Sending,
  ) {}

  public async call(
    pluginId: string,
    request: Request,
    limitMs: number | null = this.kind.limitMs,
  ): Promise<Result> {
    const generation = this.sending.generation(pluginId);

    const outcome: CallOutcome<Answer> =
      generation === undefined
        ? { ended: 'notRunning', pluginId }
        : await this.sent({ pluginId, generation }, request, limitMs);

    return this.kind.result(outcome, request);
  }

  private sent(
    caller: Caller,
    request: Request,
    limitMs: number | null,
  ): Promise<CallOutcome<Answer>> {
    const id = this.next++;
    const { promise, resolve } = Promise.withResolvers<CallOutcome<Answer>>();
    const cancel = this.deadline(caller, resolve, limitMs);

    this.waiting.set(id, { ...caller, request, settle: resolve });
    this.sending.send(caller.pluginId, this.kind.event(id, request));

    return promise.finally(() => {
      cancel();
      this.waiting.delete(id);
    });
  }

  private deadline(
    { pluginId }: Caller,
    settle: Waiting<Request, Answer>['settle'],
    limitMs: number | null,
  ): () => void {
    if (limitMs === null) return () => {};

    const late = (): void => settle({ ended: 'late', pluginId });

    return this.sending.clock.schedule(late, limitMs);
  }

  public answer(caller: Caller, answered: Answer): void {
    const waiting = this.waiting.get(answered.id);

    if (waiting && sameWorker(waiting, caller)) waiting.settle({ answered });
  }

  public request(caller: Caller, id: number): Request | undefined {
    const waiting = this.waiting.get(id);

    return waiting && sameWorker(waiting, caller) ? waiting.request : undefined;
  }

  public tell(request: Request, event: (id: number) => PluginEvent): void {
    for (const [id, waiting] of this.waiting)
      if (waiting.request === request)
        this.sending.send(waiting.pluginId, event(id));
  }

  public end(matches: (caller: Caller) => boolean): void {
    for (const { pluginId, settle, generation } of this.waiting.values())
      if (matches({ pluginId, generation }))
        settle({ ended: 'stopped', pluginId });
  }
}
