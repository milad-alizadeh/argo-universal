import { OperationExecution, type OperationId } from '@repo/contracts/operations';
import { createSessionWorkWatcher } from '../sessions';
import { requireOperationCall, type StartedOperation } from './call-recording';
import type { OperationRunResult, OperationsDeps } from './operations';
import type { OperationCaller } from './session-tokens';
import { waitForNativeWork, type WaitOptions } from './wait';
import { WaitIds } from './wait-id';
import { readOperationWork } from './work-reader';
import type { WorkObservation } from './work-observation';
import { WaitBudget } from './wait-budget';
import { isNativeStartOperation, startUserNativeWork, type NativeUserStart } from './native-user-starts';
import { operationResponse } from './work-response';

type RunObservation = { caller: OperationCaller; token?: string; wait: boolean; signal?: AbortSignal; id: OperationId };
type RunContext = { input: RunObservation; budget: WaitBudget };
type ObserveOptions = { signal?: AbortSignal; stopOnInput?: boolean; limitMs?: number };
type StartOperation = (budget: WaitBudget) => StartedOperation<OperationRunResult>;

export class OperationWork {
  private readonly ids: WaitIds;
  private readonly observation: Pick<WaitOptions, 'watch' | 'clock'>;
  public constructor(private readonly deps: OperationsDeps, private readonly caller: (token: string | undefined) => OperationCaller) {
    this.ids = new WaitIds(deps.controlToken);
    this.observation = { watch: createSessionWorkWatcher(deps), clock: deps.operationWaitClock };
  }
  public run(input: RunObservation, start: StartOperation): Promise<OperationRunResult> {
    const budget = new WaitBudget(this.deps.operationWaitClock);
    const started = start(budget);
    const context = { input, budget };
    return input.caller.kind === 'user' ? this.runUser(context, started.result) : this.runRecorded(context, started);
  }
  public startUser(operation: NativeUserStart, budget: WaitBudget): Promise<OperationRunResult> {
    return startUserNativeWork({ deps: this.deps, ids: this.ids, budget }, operation);
  }
  public wait(id: string, token: string | undefined, signal?: AbortSignal): Promise<OperationExecution> {
    return this.observe(id, () => this.caller(token), { signal });
  }
  private runRecorded(context: RunContext, started: StartedOperation<OperationRunResult>): Promise<OperationRunResult> {
    const call = requireOperationCall(started.call);
    if (context.input.caller.kind !== 'session') throw new Error('An Operation Tool call needs a Session caller');
    const id = this.ids.issue(context.input.caller, { kind: 'call', sessionId: context.input.caller.sessionId, entityId: call.toolCallId });
    return this.observeStarted(context, { ...started, id });
  }
  private runUser(context: RunContext, result: Promise<OperationRunResult>): Promise<OperationRunResult> {
    const admitted = isNativeStartOperation(context.input.id) ? result : context.budget.guard(() => result);
    return admitted.then((value) => this.userResult(context, value));
  }
  private userResult({ input, budget }: RunContext, result: OperationRunResult): Promise<OperationRunResult> {
    const execution = OperationExecution.safeParse(result);
    if (!input.wait || !execution.success) return Promise.resolve(result);
    return this.observe(execution.data.id, () => this.caller(input.token), { signal: input.signal, limitMs: budget.remaining() });
  }
  private observeStarted({ input, budget }: RunContext, started: StartedOperation<OperationRunResult> & { id: string }): Promise<OperationRunResult> {
    const detached = new AbortController();
    const signal = observationSignal(input.signal, detached.signal);
    const observed = this.observe(started.id, () => input.caller, { signal, stopOnInput: !input.wait, limitMs: budget.remaining() });
    return operationResponse(input.id, started.result, observed).finally(() => detached.abort());
  }
  private observe(id: string, caller: () => OperationCaller, options: ObserveOptions): Promise<OperationExecution> {
    const read = (): WorkObservation => this.read(id, caller());
    return waitForNativeWork({ ...options, signal: stoppingSignal(options.signal, this.deps.sessionCommandSignal), read, ...this.observation });
  }
  private read(id: string, caller: OperationCaller): WorkObservation {
    return readOperationWork({ deps: this.deps, ids: this.ids, caller }, { id, work: this.ids.require(caller, id) });
  }
}

function observationSignal(signal: AbortSignal | undefined, detached: AbortSignal): AbortSignal {
  return signal ? AbortSignal.any([signal, detached]) : detached;
}

function stoppingSignal(signal: AbortSignal | undefined, stopping: AbortSignal | undefined): AbortSignal | undefined {
  if (!stopping) return signal;
  return signal ? AbortSignal.any([signal, stopping]) : stopping;
}
