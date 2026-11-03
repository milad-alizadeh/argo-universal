import { Json } from '@repo/contracts/plugins/hook-protocol';
import type { PluginOperationCall } from '@repo/contracts/plugins/plugin-operations';
import type { PluginEvent } from '@repo/contracts/plugins/wire';
import type {
  Caller,
  CallOutcome,
  Ended,
  KindCalls,
  WorkerCalls,
} from '../runtime/worker-calls';

/*
 * How long one of a Plugin's Operations may run before the call fails. An Operation is an Agent's own
 * step, not a drawing deadline, so it is given far longer than a Slot's batched call.
 */
const operationLimitMs = 30_000;

type Request = Omit<Extract<PluginEvent, { type: 'operation' }>, 'type' | 'id'>;

export type Answer = { ok: true; result: Json } | { ok: false; error: string };

const failed = (error: string): Answer => ({ ok: false, error });

const endedError: Record<Ended, (pluginId: string, name: string) => string> = {
  notRunning: (pluginId: string): string => `Plugin ${pluginId} is not running`,
  stopped: (): string => 'Plugin stopped',
  // An Operation that never answers fails on its own, so no Agent waits on a stalled worker.
  late: (_pluginId: string, name: string): string =>
    `${name} did not answer in time`,
};

// The worker answers in wire JSON, which is parsed here before any Agent reads it.
function answerOf(
  outcome: CallOutcome<PluginOperationCall>,
  { name }: Request,
): Answer {
  if ('ended' in outcome)
    return failed(endedError[outcome.ended](outcome.pluginId, name));

  const call = outcome.answered;

  return call.action === 'result'
    ? { ok: true, result: Json.parse(call.result) }
    : failed(call.error);
}

/*
 * The runtime side of a Plugin's own Operations (ADR-0044): one call per run, answered by the worker
 * generation it went to. A Plugin that is not running answers nothing, so the caller starts it first.
 * Each run that answers is heard, whoever ran it: what the Plugin shows may have changed (ADR-0050).
 */
export class PluginOperations {
  private readonly calls: KindCalls<Request, PluginOperationCall, Answer>;
  private readonly ranListeners = new Set<(pluginId: string) => void>();

  public constructor(workers: WorkerCalls) {
    this.calls = workers.kind({
      event: (id, request) => ({ type: 'operation', id, ...request }),
      limitMs: operationLimitMs,
      result: answerOf,
    });
  }

  public async run(pluginId: string, request: Request): Promise<Answer> {
    const answer = await this.calls.call(pluginId, request);

    if (answer.ok) for (const listener of this.ranListeners) listener(pluginId);

    return answer;
  }

  // Called after each Operation that answered; the returned function stops it.
  public onRan(listener: (pluginId: string) => void): () => void {
    this.ranListeners.add(listener);

    return () => this.ranListeners.delete(listener);
  }

  // An answer from an ended worker is ignored.
  public receive(caller: Caller, call: PluginOperationCall): void {
    this.calls.answer(caller, call);
  }
}
