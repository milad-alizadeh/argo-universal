import { SessionNewInput } from '@repo/contracts';
import { OperationExecution } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { createSessionWorkWatcher, startSessionCreation } from '../sessions';
import { requireOperationCall, type StartedOperation } from './call-recording';
import type { OperationRunResult, OperationsDeps } from './operations';
import { operationParams } from './params';
import type { OperationCaller } from './session-tokens';
import { waitForNativeWork, type WaitOptions } from './wait';
import { WaitIds } from './wait-id';
import type { WorkObservation } from './work-observation';
import { readOperationWork } from './work-reader';

type RunObservation = {
  caller: OperationCaller;
  token?: string;
  wait: boolean;
  signal?: AbortSignal;
};

type ObserveOptions = { signal?: AbortSignal; stopOnInput?: boolean };

type RunResult = OperationRunResult;

export class OperationWork {
  private readonly ids: WaitIds;
  private readonly observation: Pick<WaitOptions, 'watch' | 'clock'>;
  public constructor(
    private readonly deps: OperationsDeps,
    private readonly caller: (token: string | undefined) => OperationCaller,
  ) {
    this.ids = new WaitIds(deps.controlToken);
    this.observation = {
      watch: createSessionWorkWatcher(deps),
      clock: deps.operationWaitClock,
    };
  }
  public run(
    input: RunObservation,
    started: StartedOperation<OperationRunResult>,
  ): Promise<RunResult> {
    if (input.caller.kind === 'user')
      return this.runUser(input, started.result);
    const call = requireOperationCall(started.call);

    const id = this.ids.issue(input.caller, {
      kind: 'call',
      sessionId: input.caller.sessionId,
      entityId: call.toolCallId,
    });

    return this.observeStarted(input, { ...started, id });
  }
  public async createSession(params: Json): Promise<OperationExecution> {
    const creation = await startSessionCreation(
      this.deps,
      operationParams(SessionNewInput, params),
    );

    const work = {
      kind: 'creation' as const,
      sessionId: creation.sessionId,
      entityId: creation.turnId,
    };

    const id = this.ids.issue({ kind: 'user' }, work);

    return readOperationWork(
      { deps: this.deps, ids: this.ids, caller: { kind: 'user' } },
      { id, work },
    ).execution;
  }
  public wait(
    id: string,
    token: string | undefined,
    signal?: AbortSignal,
  ): Promise<OperationExecution> {
    return this.observe(id, () => this.caller(token), { signal });
  }
  private runUser(
    input: RunObservation,
    result: Promise<RunResult>,
  ): Promise<RunResult> {
    return result.then((value) => this.userResult(input, value));
  }
  private userResult(
    input: RunObservation,
    result: RunResult,
  ): Promise<RunResult> {
    const execution = OperationExecution.safeParse(result);

    if (!input.wait || !execution.success) return Promise.resolve(result);

    return this.wait(execution.data.id, input.token, input.signal);
  }
  private observeStarted(
    input: RunObservation,
    started: StartedOperation<OperationRunResult> & { id: string },
  ): Promise<RunResult> {
    const detached = new AbortController();
    const signal = observationSignal(input.signal, detached.signal);

    const observed = this.observe(started.id, () => input.caller, {
      signal,
      stopOnInput: !input.wait,
    });

    return Promise.race([
      started.result,
      observed.then((value) => completedOrPending(value, started.result)),
    ]).finally(() => detached.abort());
  }
  private observe(
    id: string,
    caller: () => OperationCaller,
    options: ObserveOptions,
  ): Promise<OperationExecution> {
    this.ids.require(caller(), id);

    const read = (): WorkObservation =>
      readOperationWork(
        { deps: this.deps, ids: this.ids, caller: caller() },
        { id, work: this.ids.require(caller(), id) },
      );

    return waitForNativeWork({ ...options, read, ...this.observation });
  }
}

async function completedOrPending(
  value: OperationExecution,
  result: Promise<OperationRunResult>,
): Promise<RunResult> {
  if (value.cancelled) return value;

  if (!value.id.startsWith('call:')) return value;

  return value.status === 'settled' ? result : value;
}

function observationSignal(
  signal: AbortSignal | undefined,
  detached: AbortSignal,
): AbortSignal {
  return signal ? AbortSignal.any([signal, detached]) : detached;
}
