import { operations, type OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { ScreenSight } from '../screen-sight';
import {
  userOrigin,
  type NativeStartRequest,
  type SessionDirectory,
  type SessionOperationCall,
} from '../sessions';
import { requireAppCaller } from './app-only';
import {
  answer,
  type CallerImplementations,
  type AppRun,
  type UserRun,
  type SessionRun,
  type NativeStartImplementations,
  type NewSessionId,
  type OperationImplementations,
  type OperationResult,
  type OperationRunResult,
  type PlainImplementations,
  type PlainOperationId,
  type SessionInvoke,
} from './implementations';
import {
  acceptedResult,
  parsedStartedWork,
  eachNativeStart,
  isNativeStartOperation,
  type NativeStartId,
  type StartedWork,
} from './native-start';
import type { OperationArchive } from './operation-archive';
import {
  operationPermission,
  requirePermissionTurn,
} from './operation-permission';
import { parseResult, validateParams } from './params';
import type { createRunStarts } from './runs';
import { sessionOnly } from './session-only';
import type { PromptChains, SessionScope } from './session-scope';
import type { SessionCaller } from './session-tokens';
import { sessionStarts } from './start-from-session';

export type { AppRun, UserRun, SessionRun } from './implementations';

type SessionContext = { caller: SessionCaller; call: SessionOperationCall };

type RunnerPorts = {
  archive: OperationArchive;
  appRunStarts: ReturnType<typeof createRunStarts>;
  requireClearTarget: (sessionId: string) => void;
  scope: SessionScope;
  directory: SessionDirectory;
  chains: PromptChains;
  screenSight: ScreenSight;
};

// Every caller runs an Operation here; its kind picks its steps before the implementation runs and its result is parsed.
export class OperationRunner {
  private readonly plain: PlainImplementations;
  private readonly native: NativeStartImplementations;
  private readonly app: CallerImplementations<[signal?: AbortSignal]>;
  public constructor(
    implementations: OperationImplementations,
    private readonly ports: RunnerPorts,
  ) {
    this.plain = this.native = implementations;
    this.app = {
      ...implementations,
      ...this.ports.appRunStarts,
      'session.archive': this.ports.archive.app,
      ...eachNativeStart((id, params) =>
        acceptedResult(this.native[id](params, userOrigin)),
      ),
    };
  }
  public run<Id extends OperationId>(
    run: AppRun<Id>,
  ): Promise<OperationResult<Id>>;
  public run(run: UserRun | SessionRun): Promise<OperationRunResult>;
  public run<Id extends OperationId>(
    run: AppRun<Id> | UserRun | SessionRun,
  ): Promise<OperationResult<Id> | OperationRunResult> {
    requireAppCaller(run);

    if (run.kind === 'app') return this.runApp(run);

    return run.kind === 'user' ? this.runUser(run) : this.runSession(run);
  }
  private runApp<Id extends OperationId>(
    run: AppRun<Id>,
  ): Promise<OperationResult<Id>> {
    this.ports.chains.clearedByUser(run);

    return this.app[run.id](run.params, run.connectionSignal);
  }
  private async runUser(run: UserRun): Promise<OperationRunResult> {
    const { id, params, admission } = run;
    await this.requireCliPermission(run);
    this.ports.chains.clearedByUser(run);

    if (!isNativeStartOperation(id))
      return answer(await this.invoke(id, params));

    return admission.admit((signal) =>
      this.begin(id, params, { ...userOrigin, signal }),
    );
  }
  private async requireCliPermission({ id, params }: UserRun): Promise<void> {
    if (operationPermission(operations[id].policy, false) === 'ask')
      requirePermissionTurn();

    if (id === 'session.archive')
      await this.ports.archive.requireSafeForCli(validateParams(id, params));
  }
  private async runSession({
    call,
    id,
    params,
    ...caller
  }: SessionRun): Promise<OperationRunResult> {
    if (id === 'session.clear')
      this.ports.requireClearTarget(validateParams(id, params).sessionId);
    const context = { caller, call };

    const result = await this.ports.scope.run(
      { ...context, invoke: this.invokeSession(context) },
      { id, params },
    );

    return answer(result);
  }
  private invokeSession(context: SessionContext): SessionInvoke {
    const implementations: CallerImplementations<[NewSessionId]> = {
      ...this.plain,
      ...sessionOnly(this.ports.screenSight, context.caller),
      'session.archive': this.ports.archive.forSession(
        context.caller.sessionId,
        context.call,
      ),
      ...sessionStarts(context, this.ports.directory, this.native),
    };

    return async ({ id, params }, start = {}) =>
      parseResult(id, await implementations[id](params, start));
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
    return parsedStartedWork(
      id,
      this.native[id](validateParams(id, params), request),
    );
  }
}
