import type { OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import {
  sessionOrigin,
  userOrigin,
  type NativeStartRequest,
  type SessionDirectory,
  type SessionOperationCall,
} from '../sessions';
import {
  answer,
  type CallerImplementations,
  type NativeStartImplementations,
  type NewSessionId,
  type OperationImplementations,
  type OperationParams,
  type OperationResult,
  type OperationRunResult,
  type PlainImplementations,
  type PlainOperationId,
  type SessionInvoke,
} from './implementations';
import {
  acceptedResult,
  eachNativeStart,
  isNativeStartOperation,
  recordStartedWork,
  type NativeStartId,
  type StartedWork,
} from './native-start';
import { parseResult, validateParams } from './params';
import type { PromptChains, SessionScope } from './session-scope';
import type { AppCaller, SessionCaller, UserCaller } from './session-tokens';
import type { UserAdmission } from './work';

type Operation = { id: OperationId; params: Json };

// The App's procedure has parsed the params, and parses the result itself.
export type AppRun<Id extends OperationId> = AppCaller & {
  id: Id;
  params: OperationParams<Id>;
};

export type UserRun = UserCaller & Operation & { admission: UserAdmission };

export type SessionRun = SessionCaller &
  Operation & {
    call: SessionOperationCall;
  };

type SessionContext = { caller: SessionCaller; call: SessionOperationCall };

type RunnerPorts = {
  scope: SessionScope;
  directory: SessionDirectory;
  chains: PromptChains;
};

// Every caller runs an Operation here; its kind picks its steps before the implementation runs and its result is parsed.
export class OperationRunner {
  private readonly plain: PlainImplementations;
  private readonly native: NativeStartImplementations;
  private readonly app: CallerImplementations;
  public constructor(
    implementations: OperationImplementations,
    private readonly ports: RunnerPorts,
  ) {
    this.plain = implementations;
    this.native = implementations;
    this.app = {
      ...implementations,
      ...eachNativeStart((id, params) =>
        acceptedResult(this.native[id](params, userOrigin)),
      ),
    };
  }
  // The App has no step: no recording, no wait, no scope; a native start answers once admitted, as the user.
  public run<Id extends OperationId>(
    run: AppRun<Id>,
  ): Promise<OperationResult<Id>>;
  // The user's token parses the params; a Session token's scope parses them and may ask the user first.
  public run(run: UserRun | SessionRun): Promise<OperationRunResult>;
  public run<Id extends OperationId>(
    run: AppRun<Id> | UserRun | SessionRun,
  ): Promise<OperationResult<Id> | OperationRunResult> {
    if (run.kind === 'app') return this.runApp(run);

    return run.kind === 'user' ? this.runUser(run) : this.runSession(run);
  }
  private runApp<Id extends OperationId>(
    run: AppRun<Id>,
  ): Promise<OperationResult<Id>> {
    this.ports.chains.clearedByUser(run);

    return this.app[run.id](run.params);
  }
  private async runUser(run: UserRun): Promise<OperationRunResult> {
    const { id, params, admission } = run;
    this.ports.chains.clearedByUser(run);

    if (!isNativeStartOperation(id))
      return answer(await this.invoke(id, params));

    return admission.admit((signal) =>
      this.begin(id, params, { ...userOrigin, signal }),
    );
  }
  private async runSession({
    call,
    id,
    params,
    ...caller
  }: SessionRun): Promise<OperationRunResult> {
    const context = { caller, call };

    const result = await this.ports.scope.run(
      { ...context, invoke: this.invokeSession(context) },
      { id, params },
    );

    return answer(result);
  }
  // The scope parsed the params once; the result is parsed once here.
  private invokeSession(context: SessionContext): SessionInvoke {
    const implementations: CallerImplementations<[NewSessionId]> = {
      ...this.plain,
      ...eachNativeStart((id, params, start: NewSessionId) =>
        this.startFromSession(context, { id, params }, start),
      ),
    };

    return async ({ id, params }, start = {}) =>
      parseResult(id, await implementations[id](params, start));
  }
  // A Session caller's native start comes from that Session, and its Tool call follows the work.
  private async startFromSession<Id extends NativeStartId>(
    { caller, call }: SessionContext,
    { id, params }: { id: Id; params: OperationParams<Id> },
    start: NewSessionId,
  ): Promise<OperationResult<Id>> {
    const origin = sessionOrigin(
      caller.sessionId,
      this.ports.directory.title(caller.sessionId),
    );

    const started = await this.native[id](params, { ...origin, ...start });

    return recordStartedWork(call, started);
  }
  private async invoke<Id extends PlainOperationId>(
    id: Id,
    params: Json,
  ): Promise<OperationResult<Id>> {
    return parseResult(id, await this.plain[id](validateParams(id, params)));
  }
  private async begin<Id extends NativeStartId>(
    id: Id,
    params: Json,
    request: NativeStartRequest,
  ): Promise<StartedWork<OperationResult<Id>>> {
    const started = await this.native[id](validateParams(id, params), request);

    return {
      ...started,
      accepted: async () => {
        const accepted = await started.accepted();

        return { ...accepted, result: await parseResult(id, accepted.result) };
      },
    };
  }
}
