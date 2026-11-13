import { Json } from '@repo/contracts/plugins/hook-protocol';
import {
  operationLimitMs,
  type PluginOperationCall,
} from '@repo/contracts/plugins/plugin-operations';
import type { PluginEvent } from '@repo/contracts/plugins/wire';
import { failed, type Failure } from '../protocol/runtime-status';
import {
  endedError,
  type Caller,
  type Ended,
  type CallOutcome,
  type KindCalls,
  type WorkerCalls,
} from '../runtime/worker-calls';
import type { HeldSecrets } from '../services/held-secrets';

type OperationEvent = Extract<PluginEvent, { type: 'operation' }>;

/*
 * One run: what the worker is sent, and whether the Connection that asked is the Server Device, which the
 * Server keeps to scope the run's own `argo` calls and never sends the Plugin.
 */
type Request = Omit<OperationEvent, 'type' | 'id'> & {
  serverDevice?: boolean;
  secrets?: readonly string[];
};

// What a run's `argo` calls reach: the Project it acts in and whether it was asked from the Server Device.
export type RunOrigin = { projectId?: string; serverDevice: boolean };

const eventOf = (
  id: number,
  { serverDevice: _serverDevice, secrets: _secrets, ...request }: Request,
): OperationEvent => ({ type: 'operation', id, ...request });

export type Answer = { ok: true; result: Json } | Failure;

// An Operation that never answers fails on its own, so no Agent waits on a stalled worker.
const endedAnswer = (ended: Ended, pluginId: string, name: string): Answer =>
  failed(endedError(ended, pluginId, `${name} did not answer in time`));

// The worker answers in wire JSON, which is parsed here before any Agent reads it.
function answerOf(
  outcome: CallOutcome<PluginOperationCall>,
  { name }: Request,
): Answer {
  if ('ended' in outcome)
    return endedAnswer(outcome.ended, outcome.pluginId, name);

  const call = outcome.answered;

  return call.action === 'result'
    ? { ok: true, result: Json.parse(call.result) }
    : failed(call.error);
}

/*
 * The runtime side of a Plugin's own Operations (ADR-0044): one call per run, answered by the worker
 * generation it went to. A Plugin that is not running answers nothing, so the caller starts it first.
 * Every run is heard once it ends, whoever ran it and however it ended: a handler that wrote and then threw
 * leaves the Plugin's pages stale (ADR-0050).
 */
export class PluginOperations {
  private readonly calls: KindCalls<Request, PluginOperationCall, Answer>;
  private readonly ranListeners = new Set<(pluginId: string) => void>();

  public constructor(
    workers: WorkerCalls,
    private readonly secrets: HeldSecrets,
  ) {
    this.calls = workers.kind({
      event: eventOf,
      limitMs: operationLimitMs,
      result: answerOf,
    });
  }

  /*
   * A run's secret param values are held while it runs, so the log writes none of them, and what it answers is
   * scrubbed of them before any caller reads it (ADR-0051).
   */
  public async run(pluginId: string, request: Request): Promise<Answer> {
    const answer = await this.secrets.during(request.secrets ?? [], async () =>
      this.scrubbed(await this.calls.call(pluginId, request)),
    );

    for (const listener of this.ranListeners) listener(pluginId);

    return answer;
  }

  private scrubbed(answer: Answer): Answer {
    return answer.ok
      ? { ok: true, result: this.secrets.scrubJson(answer.result) }
      : failed(this.secrets.scrub(answer.error));
  }

  // Called after each Operation run ends, failed or not; the returned function stops it.
  public onRan(listener: (pluginId: string) => void): () => void {
    this.ranListeners.add(listener);

    return () => this.ranListeners.delete(listener);
  }

  /*
   * The origin of the run still waiting on the caller's generation, by its id, or none once it answered:
   * a call made after its Operation answered reaches no Project and no Server Device.
   */
  public origin(caller: Caller, id: number): RunOrigin | undefined {
    const request = this.calls.request(caller, id);

    if (!request) return undefined;

    return {
      projectId: request.caller.projectId,
      serverDevice: request.serverDevice === true,
    };
  }

  // An answer from an ended worker is ignored.
  public receive(caller: Caller, call: PluginOperationCall): void {
    this.calls.answer(caller, call);
  }
}
