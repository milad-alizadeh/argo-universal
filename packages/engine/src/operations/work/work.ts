import type { OperationExecution } from '@repo/contracts/operations';
import type { SessionWorkSource } from '../../sessions';
import { requireOperationCall, type StartedOperation } from '../call-recording';
import type { OperationRunResult } from '../implementations';
import type { OperationCaller } from '../session-tokens';
import { admitUserWork, type BeginWork } from './admission';
import { operationWaitClock, type OperationWaitClock } from './clock';
import { WaitIds } from './ids';
import { answered, observed, unadmitted, userAdmission } from './outcome';
import { WorkReading } from './reading';
import {
  operationResponse,
  recordedCaller,
  type RunObservation,
  type StartOperation,
} from './response';
import { observationSignal, stoppingSignal } from './signals';
import { waitForWork } from './wait';
import type { WaitInput, WaitOutcome, WorkAdmission } from './wait.machine';

export type WorkDeps = {
  // Signs wait ids, so only this Engine's callers resume them.
  controlToken: string;
  source: SessionWorkSource;
  clock?: OperationWaitClock;
  // The Engine's Session command signal: stopping ends every wait.
  stopping?: AbortSignal;
};

type Following = { caller: () => OperationCaller; signal?: AbortSignal };

// Runs an Operation for one call and waits up to ninety seconds for the work it started; leaving never cancels that work.
export class OperationWork {
  private readonly ids: WaitIds;
  private readonly reading: WorkReading;
  private readonly clock: OperationWaitClock;
  public constructor(
    private readonly deps: WorkDeps,
    private readonly caller: (token: string | undefined) => OperationCaller,
  ) {
    this.ids = new WaitIds(deps.controlToken);
    this.reading = new WorkReading(deps.source, this.ids);
    this.clock = deps.clock ?? operationWaitClock;
  }
  public run(
    input: RunObservation,
    start: StartOperation,
  ): Promise<OperationRunResult> {
    return input.caller.kind === 'user'
      ? this.runUser(input, start)
      : this.runRecorded(input, start(unadmitted));
  }
  // A user's native start, admitted under its run's deadline.
  public admitUser<Result>(
    begin: BeginWork<Result>,
    admission: WorkAdmission,
  ): Promise<Result | OperationExecution> {
    const context = { source: this.deps.source, ids: this.ids };

    return admitUserWork(context, begin, admission);
  }
  public async wait(
    id: string,
    token: string | undefined,
    signal?: AbortSignal,
  ): Promise<OperationExecution> {
    const following: Following = { caller: () => this.caller(token), signal };

    return observed(await this.observe(id, following, false)).execution;
  }
  private async runUser(
    input: RunObservation,
    start: StartOperation,
  ): Promise<OperationRunResult> {
    const caller = (): OperationCaller => this.caller(input.token);

    const outcome = await this.follow({
      start: userAdmission(start, input.wait),
      reader: (id) => this.reading.reader(id, caller),
      stopOnInput: false,
      signal: input.signal,
    });

    return answered(outcome);
  }
  private runRecorded(
    input: RunObservation,
    started: StartedOperation<OperationRunResult>,
  ): Promise<OperationRunResult> {
    const id = this.callId(input, started);
    const detached = new AbortController();

    const following: Following = {
      caller: () => this.recordedCaller(input, id),
      signal: observationSignal(input.signal, detached.signal),
    };

    const work = this.observe(id, following, !input.wait).then(observed);

    return operationResponse(input.id, started.result, work).finally(() =>
      detached.abort(),
    );
  }
  private callId(
    { caller }: RunObservation,
    started: StartedOperation<OperationRunResult>,
  ): string {
    const call = requireOperationCall(started.call);

    if (caller.kind !== 'session')
      throw new Error('An Operation Tool call needs a Session caller');

    const work = { sessionId: caller.sessionId, entityId: call.toolCallId };

    return this.ids.issue(caller, { kind: 'call', ...work });
  }
  private observe(
    id: string,
    { caller, signal }: Following,
    stopOnInput: boolean,
  ): Promise<WaitOutcome> {
    return this.follow({
      start: { observe: id },
      reader: () => this.reading.reader(id, caller),
      stopOnInput,
      signal,
    });
  }
  private follow(input: WaitInput): Promise<WaitOutcome> {
    const signal = stoppingSignal(input.signal, this.deps.stopping);

    return waitForWork({ ...input, signal }, this.clock);
  }
  private recordedCaller(input: RunObservation, id: string): OperationCaller {
    return recordedCaller(
      input.caller,
      () => this.caller(input.token),
      () => this.reading.read(id, input.caller),
    );
  }
}
