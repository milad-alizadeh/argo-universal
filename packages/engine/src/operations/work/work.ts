import type { OperationExecution } from '@repo/contracts/operations';
import type { SessionWorkSource } from '../../sessions';
import type { RecordedOperation } from '../call-recording';
import type { OperationRunResult } from '../implementations';
import type { SessionCaller, TokenCaller } from '../session-tokens';
import { userAdmission, type UserAdmission } from './admission';
import {
  operationWaitClock,
  type OperationWaitClock,
  type ObservationOptions,
} from './clock';
import { WaitId, WaitIds } from './ids';
import { admittedStart, answered, observed } from './outcome';
import { WorkReading } from './reading';
import {
  operationResponse,
  recordedCaller,
  type SessionObservation,
} from './response';
import { observationSignal, stoppingSignal } from './signals';
import { waitForWork } from './wait';
import type {
  WaitInput,
  WaitOutcome,
  WorkAdmission,
  WaitStart,
} from './wait.machine';

export type WorkDeps = {
  // Signs wait ids, so only this Engine's callers resume them.
  controlToken: string;
  source: SessionWorkSource;
  clock?: OperationWaitClock;
  // The Engine's Session command signal: stopping ends every wait.
  stopping?: AbortSignal;
};

// A user's run: its token, whether it waits, and its connection.
export type UserObservation = ObservationOptions & {
  token?: string;
  wait: boolean;
};

type Following = ObservationOptions & { caller: () => TokenCaller };

// Runs an Operation for one call and waits up to ninety seconds for the work it started; leaving never cancels that work.
export class OperationWork {
  private readonly ids: WaitIds;
  private readonly reading: WorkReading;
  private readonly clock: OperationWaitClock;
  public constructor(
    private readonly deps: WorkDeps,
    private readonly caller: (token: string | undefined) => TokenCaller,
  ) {
    this.ids = new WaitIds(deps.controlToken);
    this.reading = new WorkReading(deps.source, this.ids);
    this.clock = deps.clock ?? operationWaitClock;
  }
  // A user's Operation runs under the deadline, which also admits any native start it makes.
  public async runUser(
    input: UserObservation,
    start: (admission: UserAdmission) => Promise<OperationRunResult>,
  ): Promise<OperationRunResult> {
    const outcome = await this.follow({
      start: this.userStart(input.wait, start),
      reader: (id) => this.reading.reader(id, () => this.caller(input.token)),
      stopOnInput: false,
      signal: input.signal,
      timeoutMs: input.timeoutMs,
    });

    return answered(outcome);
  }
  private userStart(
    wait: boolean,
    start: (admission: UserAdmission) => Promise<OperationRunResult>,
  ): WaitStart {
    return admittedStart((admission) => start(this.admission(admission)), wait);
  }
  private admission(admission: WorkAdmission): UserAdmission {
    return userAdmission(
      { source: this.deps.source, ids: this.ids },
      admission,
    );
  }
  // A Session caller's Operation answers with its result, or with what its Tool call observed first.
  public runRecorded(
    input: SessionObservation,
    started: RecordedOperation<OperationRunResult>,
  ): Promise<OperationRunResult> {
    const id = this.callId(input.caller, started);
    const detached = new AbortController();

    const following = this.recordedObservation(input, id, detached.signal);

    const work = this.observe(id, following, !input.wait).then(observed);

    return operationResponse(input.id, started.result, work).finally(() =>
      detached.abort(),
    );
  }
  private recordedObservation(
    input: SessionObservation,
    id: WaitId,
    signal: AbortSignal,
  ): Following {
    return {
      caller: () => this.recordedCaller(input, id),
      signal: observationSignal(input.signal, signal),
      timeoutMs: input.timeoutMs,
    };
  }
  public async wait(
    id: string,
    token: string | undefined,
    options: ObservationOptions = {},
  ): Promise<OperationExecution> {
    const following: Following = {
      ...options,
      caller: () => this.caller(token),
    };

    const waitId = WaitId.parse(id);

    return observed(await this.observe(waitId, following, false)).execution;
  }
  private callId(
    caller: SessionCaller,
    { call }: RecordedOperation<OperationRunResult>,
  ): WaitId {
    return this.ids.issue(caller, {
      kind: 'call',
      sessionId: caller.sessionId,
      toolCallId: call.toolCallId,
    });
  }
  private observe(
    id: WaitId,
    { caller, signal, timeoutMs }: Following,
    stopOnInput: boolean,
  ): Promise<WaitOutcome> {
    return this.follow({
      start: { kind: 'observe', id },
      reader: () => this.reading.reader(id, caller),
      stopOnInput,
      signal,
      timeoutMs,
    });
  }
  private follow(input: WaitInput): Promise<WaitOutcome> {
    const signal = stoppingSignal(input.signal, this.deps.stopping);

    return waitForWork({ ...input, signal }, this.clock);
  }
  private recordedCaller(input: SessionObservation, id: WaitId): TokenCaller {
    return recordedCaller(
      input.caller,
      () => this.caller(input.token),
      () => this.reading.read(id, input.caller),
    );
  }
}
