import type { OperationExecution } from '@repo/contracts/operations';
import { requireOperationCall, type StartedOperation } from './call-recording';
import type { OperationResult, OperationsDeps } from './operations';
import type { OperationCaller } from './session-tokens';
import { waitForNativeWork, type WaitOptions } from './wait';
import { WaitIds } from './wait-id';
import { readOperationWork } from './work-reader';

type RunObservation = {
  caller: OperationCaller;
  token?: string;
  wait: boolean;
  signal?: AbortSignal;
};

type ObserveOptions = { signal?: AbortSignal; stopOnInput?: boolean };

type RunResult = OperationResult | OperationExecution;

export class OperationWork {
  private readonly ids: WaitIds;
  private readonly observation: Pick<WaitOptions, 'watch' | 'clock'>;
  public constructor(
    private readonly deps: OperationsDeps,
    private readonly caller: (token: string | undefined) => OperationCaller,
  ) {
    this.ids = new WaitIds(deps.controlToken);
    this.observation = {
      watch: deps.watchSessionSnapshot,
      clock: deps.operationWaitClock,
    };
  }
  public run(
    input: RunObservation,
    started: StartedOperation<OperationResult>,
  ): Promise<RunResult> {
    if (input.caller.kind === 'user') return started.result;
    const call = requireOperationCall(started.call);

    const id = this.ids.issue(input.caller, {
      kind: 'call',
      sessionId: input.caller.sessionId,
      entityId: call.toolCallId,
    });

    return this.observeStarted(input, { ...started, id });
  }
  public wait(
    id: string,
    token: string | undefined,
    signal?: AbortSignal,
  ): Promise<OperationExecution> {
    return this.observe(id, () => this.caller(token), { signal });
  }
  private observeStarted(
    input: RunObservation,
    started: StartedOperation<OperationResult> & { id: string },
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
    const work = this.ids.require(caller(), id);

    const read = (): OperationExecution =>
      readOperationWork(this.deps, id, this.ids.require(caller(), id));

    return waitForNativeWork({
      ...options,
      read,
      sessionId: work.sessionId,
      ...this.observation,
    });
  }
}

async function completedOrPending(
  value: OperationExecution,
  result: Promise<OperationResult>,
): Promise<RunResult> {
  if (value.cancelled) return value;

  return value.status === 'settled' ? result : value;
}

function observationSignal(
  signal: AbortSignal | undefined,
  detached: AbortSignal,
): AbortSignal {
  return signal ? AbortSignal.any([signal, detached]) : detached;
}
