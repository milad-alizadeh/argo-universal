import type { QueryReadAnswer } from '@repo/contracts/plugins/page-address';
import type { WireJson } from '@repo/contracts/plugins/wire';
import type { PluginReply } from '../protocol/runtime';
import {
  endedError,
  type Ended,
  type Caller,
  type CallOutcome,
  type KindCalls,
  type WorkerCalls,
} from '../runtime/worker-calls';

// A named read is the Plugin's own code, so it is given as long as a draw's Loader.
const readLimitMs = 30_000;

// One named read Argo asks the running worker for, for the Query's Project and, for a paged-list page, the draw.
export type NamedRead = {
  name: string;
  args: WireJson;
  projectId?: string;
  draw?: number;
};

const endedReply = (
  ended: Ended,
  pluginId: string,
  { name }: NamedRead,
): PluginReply => ({
  ok: false,
  error: endedError(ended, pluginId, `The ${name} read did not answer in time`),
});

function replyOf(
  outcome: CallOutcome<QueryReadAnswer>,
  read: NamedRead,
): PluginReply {
  if ('ended' in outcome)
    return endedReply(outcome.ended, outcome.pluginId, read);

  const { answered } = outcome;

  return answered.action === 'read'
    ? { ok: true, value: answered.value }
    : { ok: false, error: answered.error };
}

// The named reads Queries run: each one call to the running worker generation, answered by its id.
export class NamedReads {
  private readonly calls: KindCalls<NamedRead, QueryReadAnswer, PluginReply>;

  public constructor(workers: WorkerCalls) {
    this.calls = workers.kind({
      event: (id, read) => ({ type: 'read', id, ...read }),
      limitMs: readLimitMs,
      result: replyOf,
    });
  }

  public run(pluginId: string, read: NamedRead): Promise<PluginReply> {
    return this.calls.call(pluginId, read);
  }

  public receive(caller: Caller, answer: QueryReadAnswer): void {
    this.calls.answer(caller, answer);
  }
}
