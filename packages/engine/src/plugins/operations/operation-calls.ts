import { Json } from '@repo/contracts/plugins/hook-protocol';
import type { PluginOperationCall } from '@repo/contracts/plugins/plugin-operations';
import type { PluginEvent } from '@repo/contracts/plugins/wire';
import type { PluginClock } from '../clock';

/*
 * How long one of a Plugin's Operations may run before the call fails. An Operation is an Agent's own
 * step, not a drawing deadline, so it is given far longer than a Slot's batched call.
 */
const operationLimitMs = 30_000;

export type Caller = { pluginId: string; generation: number };

export type Invocation = Extract<PluginEvent, { type: 'operation' }>;

export type Answer = { ok: true; result: Json } | { ok: false; error: string };

type Pending = Caller & { settle: (answer: Answer) => void };

export type OperationTransport = {
  send: (pluginId: string, event: PluginEvent) => void;
  clock: PluginClock;
};

const failed = (error: string): Answer => ({ ok: false, error });

// The Operation calls in flight, each answered by its id from the worker generation it went to.
export class PluginOperationCalls {
  private readonly pending = new Map<number, Pending>();
  private next = 0;

  public constructor(private readonly transport: OperationTransport) {}

  public call(
    caller: Caller,
    request: Omit<Invocation, 'type' | 'id'>,
  ): Promise<Answer> {
    const id = this.next++;
    const { promise, resolve } = Promise.withResolvers<Answer>();
    const cancel = this.deadline(request.name, resolve);

    this.pending.set(id, { ...caller, settle: resolve });
    this.transport.send(caller.pluginId, { type: 'operation', id, ...request });

    return promise.finally(() => {
      cancel();
      this.pending.delete(id);
    });
  }

  // An Operation that never answers fails on its own, so no Agent waits on a stalled worker.
  private deadline(name: string, settle: (answer: Answer) => void): () => void {
    return this.transport.clock.schedule(
      () => settle(failed(`${name} did not answer in time`)),
      operationLimitMs,
    );
  }

  public settle(caller: Caller, call: PluginOperationCall): void {
    const pending = this.pending.get(call.id);

    if (!pending || !sameWorker(pending, caller)) return;

    pending.settle(answerOf(call));
  }

  public release(pluginId: string): void {
    this.stop((pending) => pending.pluginId === pluginId);
  }

  public close(): void {
    this.stop(() => true);
  }

  private stop(matches: (pending: Pending) => boolean): void {
    for (const pending of this.pending.values())
      if (matches(pending)) pending.settle(failed('Plugin stopped'));
  }
}

// The worker answers in wire JSON, which is parsed here before any Agent reads it.
const answerOf = (call: PluginOperationCall): Answer =>
  call.action === 'result'
    ? { ok: true, result: Json.parse(call.result) }
    : failed(call.error);

const sameWorker = (left: Caller, right: Caller): boolean =>
  left.pluginId === right.pluginId && left.generation === right.generation;
