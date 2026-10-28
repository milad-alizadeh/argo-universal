import { OperationExecution } from '@repo/contracts/operations';
import type { SessionWorkSource } from '../../sessions';
import { requireOperationCall, type StartedOperation } from '../call-recording';
import { isNativeStartOperation } from '../native-start';
import type { OperationRunResult, OperationsDeps } from '../operations';
import type { OperationCaller } from '../session-tokens';
import { admitUserWork, type BeginWork } from './admission';
import { WaitBudget } from './budget';
import { watchOperationWork } from './caller-watch';
import { WaitIds } from './ids';
import type { WorkObservation } from './observation';
import { readOperationWork } from './reader';
import {
  operationResponse,
  recordedCaller,
  type RunObservation,
  type RunContext,
  type ObserveOptions,
  type StartOperation,
} from './response';
import { observationSignal, stoppingSignal } from './signals';
import { waitForNativeWork } from './wait';

export class OperationWork {
  private readonly ids: WaitIds;
  public constructor(
    private readonly deps: OperationsDeps,
    private readonly caller: (token: string | undefined) => OperationCaller,
    private readonly source: SessionWorkSource,
  ) {
    this.ids = new WaitIds(deps.controlToken);
  }
  public run(
    input: RunObservation,
    start: StartOperation,
  ): Promise<OperationRunResult> {
    const budget = new WaitBudget(this.deps.operationWaitClock);
    const started = start(budget);
    const context = { input, budget };

    return input.caller.kind === 'user'
      ? this.runUser(context, started.result)
      : this.runRecorded(context, started);
  }
  public admitUser<Result>(
    begin: BeginWork<Result>,
    budget: WaitBudget,
  ): Promise<Result | OperationExecution> {
    return admitUserWork({ source: this.source, ids: this.ids, budget }, begin);
  }
  public wait(
    id: string,
    token: string | undefined,
    signal?: AbortSignal,
  ): Promise<OperationExecution> {
    return this.observe(id, () => this.caller(token), { signal });
  }
  private runRecorded(
    context: RunContext,
    started: StartedOperation<OperationRunResult>,
  ): Promise<OperationRunResult> {
    const call = requireOperationCall(started.call);

    if (context.input.caller.kind !== 'session')
      throw new Error('An Operation Tool call needs a Session caller');

    const id = this.ids.issue(context.input.caller, {
      kind: 'call',
      sessionId: context.input.caller.sessionId,
      entityId: call.toolCallId,
    });

    return this.observeStarted(context, { ...started, id });
  }
  private runUser(
    context: RunContext,
    result: Promise<OperationRunResult>,
  ): Promise<OperationRunResult> {
    const admitted = isNativeStartOperation(context.input.id)
      ? result
      : context.budget.guard(() => result);

    return admitted.then((value) => this.userResult(context, value));
  }
  private userResult(
    { input, budget }: RunContext,
    result: OperationRunResult,
  ): Promise<OperationRunResult> {
    const execution = OperationExecution.safeParse(result);

    if (!input.wait || !execution.success) return Promise.resolve(result);

    return this.observe(execution.data.id, () => this.caller(input.token), {
      signal: input.signal,
      limitMs: budget.remaining(),
    });
  }
  private observeStarted(
    context: RunContext,
    started: StartedOperation<OperationRunResult> & { id: string },
  ): Promise<OperationRunResult> {
    const detached = new AbortController();
    const observed = this.observeRecorded(context, started.id, detached.signal);

    return operationResponse(
      context.input.id,
      started.result,
      observed,
    ).finally(() => detached.abort());
  }
  private observeRecorded(
    { input, budget }: RunContext,
    id: string,
    detached: AbortSignal,
  ): Promise<OperationExecution> {
    return this.observe(id, () => this.recordedCaller(input, id), {
      signal: observationSignal(input.signal, detached),
      stopOnInput: !input.wait,
      limitMs: budget.remaining(),
    });
  }
  private recordedCaller(input: RunObservation, id: string): OperationCaller {
    return recordedCaller(
      input.caller,
      () => this.caller(input.token),
      () => this.read(id, input.caller),
    );
  }
  private observe(
    id: string,
    caller: () => OperationCaller,
    options: ObserveOptions,
  ): Promise<OperationExecution> {
    const read = (): WorkObservation => this.read(id, caller());

    return waitForNativeWork({
      ...options,
      signal: stoppingSignal(options.signal, this.deps.sessionCommandSignal),
      read,
      clock: this.deps.operationWaitClock,
      watch: watchOperationWork(this.source.watch, caller()),
    });
  }
  private read(id: string, caller: OperationCaller): WorkObservation {
    return readOperationWork(
      { source: this.source, ids: this.ids, caller },
      { id, work: this.ids.require(caller, id) },
    );
  }
}
